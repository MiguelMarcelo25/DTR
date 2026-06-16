import type { Request } from 'express';
import { Prisma, AttendanceStatus, RequestStatus, LeaveStatus, TimelineEventType, NotificationType } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES, PRIVILEGED_ROLES } from '../config/constants';
import type { AuthUser } from '../types';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { ensureSelfOrPrivileged, isPrivileged } from '../utils/access';
import { buildMeta, buildOrderBy, buildPagination } from '../utils/pagination';
import { audit } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';
import { atTime, diffMinutes, startOfDay, startOfMonth, endOfMonth } from '../utils/dateTime';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

interface ScheduleConfig {
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  workDays: number[];
}

/** A completed day below this many worked minutes is treated as a half day. */
const HALF_DAY_MINUTES = 240;
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

/** 'YYYY-MM-DD' key for a (UTC-midnight) business date. */
function dayKey(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}
/** Inclusive list of 'YYYY-MM-DD' keys from start..end. */
function eachDayKeys(start: Date, end: Date): string[] {
  const out: string[] = [];
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  for (let t = s; t <= e; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
/** Weekday (0=Sun..6=Sat) for a 'YYYY-MM-DD' business-date key. */
function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay();
}

/** Approved-leave dates + holiday dates within a range, for absence classification. */
async function loadLeaveHolidayContext(employeeId: string, start: Date, end: Date) {
  const rangeStart = startOfDay(start);
  const rangeEnd = startOfDay(end);
  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart },
      },
      select: { startDate: true, endDate: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true },
    }),
  ]);
  const leaveDates = new Set<string>();
  for (const l of leaves) for (const k of eachDayKeys(l.startDate, l.endDate)) leaveDates.add(k);
  const holidayDates = new Set(holidays.map((h) => dayKey(h.date)));
  return { leaveDates, holidayDates };
}

/** Load an employee + its schedule, or throw 404. */
async function loadEmployeeWithSchedule(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { schedule: true },
  });
  if (!employee) throw notFound('Employee not found');
  return employee;
}

/**
 * Resolve the employeeId an actor is operating on. A non-privileged user is
 * pinned to their own linked employee record; privileged users may target any
 * employee via `requestedEmployeeId` (falling back to their own).
 */
function resolveTargetEmployeeId(user: AuthUser, requestedEmployeeId?: string): string {
  if (requestedEmployeeId && isPrivileged(user)) return requestedEmployeeId;
  if (user.employeeId) return user.employeeId;
  if (requestedEmployeeId) return requestedEmployeeId;
  throw forbidden('No employee record is linked to your account');
}

/** Require the actor to have a linked employee record (self-service endpoints). */
function requireSelfEmployeeId(user: AuthUser): string {
  if (!user.employeeId) throw forbidden('No employee record is linked to your account');
  return user.employeeId;
}

interface TimeMetrics {
  lateMinutes: number;
  undertimeMinutes: number;
  workedMinutes: number;
  status: AttendanceStatus;
}

/**
 * Pure computation of late/undertime/worked minutes against a schedule.
 * - lateMinutes: minutes timeIn is after scheduleTimeIn + grace.
 * - undertimeMinutes: minutes timeOut is before scheduleTimeOut.
 * - workedMinutes: diff(timeIn, timeOut) minus break (actual break if both
 *   break punches present, else the schedule's break allowance).
 * - status: LATE if lateMinutes > 0, otherwise PRESENT.
 */
function computeMetrics(
  date: Date,
  schedule: ScheduleConfig | null,
  timeIn: Date | null,
  timeOut: Date | null,
  breakIn: Date | null,
  breakOut: Date | null,
): TimeMetrics {
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let workedMinutes = 0;

  if (schedule && timeIn) {
    const graceCutoff = new Date(
      atTime(date, schedule.timeIn).getTime() + schedule.gracePeriodMinutes * 60000,
    );
    lateMinutes = diffMinutes(graceCutoff, timeIn);
  }

  if (schedule && timeOut) {
    const scheduledOut = atTime(date, schedule.timeOut);
    undertimeMinutes = diffMinutes(timeOut, scheduledOut);
  }

  if (timeIn && timeOut) {
    const gross = diffMinutes(timeIn, timeOut);
    let breakDeduction = schedule ? schedule.breakMinutes : 0;
    if (breakIn && breakOut) breakDeduction = diffMinutes(breakIn, breakOut);
    workedMinutes = Math.max(0, gross - breakDeduction);
  }

  // A completed day with fewer than HALF_DAY_MINUTES worked is a half day.
  let status: AttendanceStatus;
  if (timeIn && timeOut && workedMinutes > 0 && workedMinutes < HALF_DAY_MINUTES) {
    status = AttendanceStatus.HALF_DAY;
  } else if (lateMinutes > 0) {
    status = AttendanceStatus.LATE;
  } else {
    status = AttendanceStatus.PRESENT;
  }

  return { lateMinutes, undertimeMinutes, workedMinutes, status };
}

function scheduleConfig(schedule: {
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  workDays: number[];
} | null): ScheduleConfig | null {
  if (!schedule) return null;
  return {
    timeIn: schedule.timeIn,
    timeOut: schedule.timeOut,
    breakMinutes: schedule.breakMinutes,
    gracePeriodMinutes: schedule.gracePeriodMinutes,
    workDays: schedule.workDays,
  };
}

// ─────────────────────────────────────────────────────────────
// Punch operations (self)
// ─────────────────────────────────────────────────────────────

export async function timeIn(req: Request, user: AuthUser) {
  const employeeId = requireSelfEmployeeId(user);
  ensureSelfOrPrivileged(user, employeeId);

  const employee = await loadEmployeeWithSchedule(employeeId);
  const schedule = scheduleConfig(employee.schedule);

  const now = new Date();
  const date = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing?.timeIn) {
    throw conflict('You have already timed in today');
  }

  const metrics = computeMetrics(date, schedule, now, existing?.timeOut ?? null, existing?.breakIn ?? null, existing?.breakOut ?? null);

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: {
      employeeId,
      date,
      timeIn: now,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      workedMinutes: metrics.workedMinutes,
      status: metrics.status,
    },
    update: {
      timeIn: now,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      workedMinutes: metrics.workedMinutes,
      status: metrics.status,
    },
  });

  await audit(req, {
    action: 'ATTENDANCE_CREATED',
    module: MODULES.ATTENDANCE,
    description: `Timed in${metrics.lateMinutes > 0 ? ` (late ${metrics.lateMinutes}m)` : ''}`,
    employeeId,
    newValues: { timeIn: now, status: metrics.status, lateMinutes: metrics.lateMinutes },
  });

  return record;
}

export async function timeOut(req: Request, user: AuthUser) {
  const employeeId = requireSelfEmployeeId(user);
  ensureSelfOrPrivileged(user, employeeId);

  const employee = await loadEmployeeWithSchedule(employeeId);
  const schedule = scheduleConfig(employee.schedule);

  const now = new Date();
  const date = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!existing || !existing.timeIn) {
    throw badRequest('You must time in before timing out', 'NOT_TIMED_IN');
  }
  if (existing.timeOut) {
    throw conflict('You have already timed out today');
  }

  const metrics = computeMetrics(
    date,
    schedule,
    existing.timeIn,
    now,
    existing.breakIn,
    existing.breakOut,
  );

  const workSummary =
    typeof req.body?.workSummary === 'string' && req.body.workSummary.trim()
      ? req.body.workSummary.trim()
      : undefined;

  const record = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      timeOut: now,
      undertimeMinutes: metrics.undertimeMinutes,
      workedMinutes: metrics.workedMinutes,
      lateMinutes: metrics.lateMinutes,
      status: metrics.status,
      ...(workSummary ? { workSummary } : {}),
    },
  });

  await audit(req, {
    action: 'ATTENDANCE_UPDATED',
    module: MODULES.ATTENDANCE,
    description: `Timed out (worked ${metrics.workedMinutes}m, undertime ${metrics.undertimeMinutes}m)`,
    employeeId,
    newValues: { timeOut: now, workedMinutes: metrics.workedMinutes, undertimeMinutes: metrics.undertimeMinutes },
  });

  return record;
}

export async function breakIn(_req: Request, user: AuthUser) {
  const employeeId = requireSelfEmployeeId(user);
  ensureSelfOrPrivileged(user, employeeId);

  const now = new Date();
  const date = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!existing || !existing.timeIn) {
    throw badRequest('You must time in before starting a break', 'NOT_TIMED_IN');
  }
  if (existing.breakIn) {
    throw conflict('You have already started your break today');
  }

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { breakIn: now },
  });
}

export async function breakOut(_req: Request, user: AuthUser) {
  const employeeId = requireSelfEmployeeId(user);
  ensureSelfOrPrivileged(user, employeeId);

  const employee = await loadEmployeeWithSchedule(employeeId);
  const schedule = scheduleConfig(employee.schedule);

  const now = new Date();
  const date = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!existing || !existing.breakIn) {
    throw badRequest('You must start a break before ending it', 'NO_BREAK_STARTED');
  }
  if (existing.breakOut) {
    throw conflict('You have already ended your break today');
  }

  // Recompute worked minutes now that the actual break length is known.
  const metrics = computeMetrics(
    date,
    schedule,
    existing.timeIn,
    existing.timeOut,
    existing.breakIn,
    now,
  );

  return prisma.attendance.update({
    where: { id: existing.id },
    data: {
      breakOut: now,
      workedMinutes: metrics.workedMinutes,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Lists & reads
// ─────────────────────────────────────────────────────────────

const ATTENDANCE_SORT = ['date', 'createdAt', 'lateMinutes', 'undertimeMinutes', 'workedMinutes', 'status'];

interface LogFilters {
  employeeId?: string;
  status?: AttendanceStatus;
  from?: Date;
  to?: Date;
}

function buildDateRangeWhere(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = startOfDay(from);
  if (to) filter.lte = startOfDay(to);
  return filter;
}

/** Privileged paginated attendance logs (also serves /logs). */
export async function listLogs(query: Record<string, unknown>, filters: LogFilters) {
  const params = buildPagination(query);

  const where: Prisma.AttendanceWhereInput = {};
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.status) where.status = filters.status;
  const dateRange = buildDateRangeWhere(filters.from, filters.to);
  if (dateRange) where.date = dateRange;

  const orderBy = buildOrderBy(params, ATTENDANCE_SORT, 'date');

  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy,
      include: {
        employee: {
          select: {
            id: true,
            employeeNo: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

/** Own attendance history (privileged may pass employeeId), newest first. */
export async function history(user: AuthUser, query: Record<string, unknown>, opts: { employeeId?: string; from?: Date; to?: Date }) {
  const employeeId = resolveTargetEmployeeId(user, opts.employeeId);
  ensureSelfOrPrivileged(user, employeeId);

  const params = buildPagination(query);

  const where: Prisma.AttendanceWhereInput = { employeeId };
  const dateRange = buildDateRangeWhere(opts.from, opts.to);
  if (dateRange) where.date = dateRange;

  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { date: 'desc' },
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

/** Array of attendance rows for every day of the requested month. */
export async function monthlyDtr(
  user: AuthUser,
  opts: { employeeId?: string; year: number; month: number },
) {
  const employeeId = resolveTargetEmployeeId(user, opts.employeeId);
  ensureSelfOrPrivileged(user, employeeId);

  const month0 = opts.month - 1;
  const start = startOfMonth(opts.year, month0);
  const end = endOfMonth(opts.year, month0);

  const [rows, ctx, emp] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: startOfDay(start), lte: startOfDay(end) } },
      orderBy: { date: 'asc' },
    }),
    loadLeaveHolidayContext(employeeId, start, end),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { schedule: { select: { workDays: true } } },
    }),
  ]);
  const workDays = emp?.schedule?.workDays?.length ? emp.schedule.workDays : DEFAULT_WORK_DAYS;

  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) byKey.set(dayKey(row.date), row);

  const daysInMonth = new Date(opts.year, opts.month, 0).getDate();
  const days = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(opts.year, month0, day));
    const key = dayKey(date);
    const attendance = byKey.get(key) ?? null;
    // For days with no punch, derive what the day was.
    let derivedStatus: 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'REST_DAY' | null = null;
    if (!attendance) {
      if (ctx.holidayDates.has(key)) derivedStatus = 'HOLIDAY';
      else if (ctx.leaveDates.has(key)) derivedStatus = 'ON_LEAVE';
      else if (workDays.includes(weekdayOf(key))) derivedStatus = 'ABSENT';
      else derivedStatus = 'REST_DAY';
    }
    days.push({ date, day, attendance, derivedStatus });
  }

  return { employeeId, year: opts.year, month: opts.month, days };
}

/** Aggregate counts for a date range or a month. */
export async function summary(
  user: AuthUser,
  opts: { employeeId?: string; year?: number; month?: number; from?: Date; to?: Date },
) {
  const employeeId = resolveTargetEmployeeId(user, opts.employeeId);
  ensureSelfOrPrivileged(user, employeeId);

  let from = opts.from;
  let to = opts.to;
  if ((!from || !to) && opts.year && opts.month) {
    const month0 = opts.month - 1;
    from = startOfMonth(opts.year, month0);
    to = endOfMonth(opts.year, month0);
  }
  if (!from || !to) {
    throw badRequest('Provide a from/to date range or a year and month', 'RANGE_REQUIRED');
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { schedule: { select: { workDays: true } } },
  });
  const workDays = emp?.schedule?.workDays?.length ? emp.schedule.workDays : DEFAULT_WORK_DAYS;

  const rows = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: startOfDay(from), lte: startOfDay(to) } },
    select: { date: true, status: true, lateMinutes: true, undertimeMinutes: true, workedMinutes: true },
  });
  const byDate = new Map<string, (typeof rows)[number]>();
  for (const r of rows) byDate.set(dayKey(r.date), r);

  const { leaveDates, holidayDates } = await loadLeaveHolidayContext(employeeId, from, to);

  const summaryResult = {
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    holiday: 0,
    totalLateMinutes: 0,
    totalUndertimeMinutes: 0,
    totalWorkedMinutes: 0,
  };

  // Classify every calendar day in the range — records first, then derive
  // absence/leave/holiday/rest for days with no punch.
  for (const key of eachDayKeys(from, to)) {
    const rec = byDate.get(key);
    if (rec) {
      if (rec.status === AttendanceStatus.PRESENT) summaryResult.present += 1;
      else if (rec.status === AttendanceStatus.LATE) summaryResult.late += 1;
      else if (rec.status === AttendanceStatus.HALF_DAY) summaryResult.halfDay += 1;
      else if (rec.status === AttendanceStatus.ABSENT) summaryResult.absent += 1;
      else if (rec.status === AttendanceStatus.ON_LEAVE) summaryResult.onLeave += 1;
      else if (rec.status === AttendanceStatus.HOLIDAY) summaryResult.holiday += 1;
      summaryResult.totalLateMinutes += rec.lateMinutes;
      summaryResult.totalUndertimeMinutes += rec.undertimeMinutes;
      summaryResult.totalWorkedMinutes += rec.workedMinutes;
      continue;
    }
    if (holidayDates.has(key)) summaryResult.holiday += 1;
    else if (leaveDates.has(key)) summaryResult.onLeave += 1;
    else if (workDays.includes(weekdayOf(key))) summaryResult.absent += 1; // scheduled, unworked → absent
    // otherwise a rest day — not counted
  }

  return {
    employeeId,
    from: startOfDay(from),
    to: startOfDay(to),
    ...summaryResult,
  };
}

// ─────────────────────────────────────────────────────────────
// Corrections
// ─────────────────────────────────────────────────────────────

interface CreateCorrectionInput {
  date: Date;
  requestedTimeIn?: Date;
  requestedTimeOut?: Date;
  requestedBreakIn?: Date;
  requestedBreakOut?: Date;
  reason: string;
}

export async function createCorrection(req: Request, user: AuthUser, input: CreateCorrectionInput) {
  const employeeId = requireSelfEmployeeId(user);
  ensureSelfOrPrivileged(user, employeeId);

  const date = startOfDay(input.date);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });

  const correction = await prisma.attendanceCorrection.create({
    data: {
      employeeId,
      attendanceId: existing?.id ?? null,
      date,
      requestedTimeIn: input.requestedTimeIn ?? null,
      requestedTimeOut: input.requestedTimeOut ?? null,
      requestedBreakIn: input.requestedBreakIn ?? null,
      requestedBreakOut: input.requestedBreakOut ?? null,
      reason: input.reason,
      status: RequestStatus.PENDING,
    },
  });

  await audit(req, {
    action: 'ATTENDANCE_CORRECTION_REQUESTED',
    module: MODULES.ATTENDANCE,
    description: `Requested attendance correction for ${date.toISOString().slice(0, 10)}`,
    employeeId,
    newValues: { correctionId: correction.id, reason: input.reason },
  });

  // Notify HR/Admins of the pending request.
  const reviewers = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: { in: PRIVILEGED_ROLES } } } },
    },
    select: { id: true },
  });
  await Promise.all(
    reviewers.map((r) =>
      notify({
        userId: r.id,
        type: NotificationType.ATTENDANCE,
        title: 'Attendance Correction Request',
        message: `A correction was requested for ${date.toISOString().slice(0, 10)}.`,
        link: `/attendance/corrections/${correction.id}`,
      }),
    ),
  );

  return correction;
}

/** List corrections (self own; privileged all). */
export async function listCorrections(
  user: AuthUser,
  query: Record<string, unknown>,
  opts: { employeeId?: string; status?: RequestStatus },
) {
  const params = buildPagination(query);

  const where: Prisma.AttendanceCorrectionWhereInput = {};
  if (isPrivileged(user)) {
    if (opts.employeeId) where.employeeId = opts.employeeId;
  } else {
    where.employeeId = requireSelfEmployeeId(user);
  }
  if (opts.status) where.status = opts.status;

  const [total, items] = await Promise.all([
    prisma.attendanceCorrection.count({ where }),
    prisma.attendanceCorrection.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeNo: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

async function getCorrectionOrThrow(id: string) {
  const correction = await prisma.attendanceCorrection.findUnique({ where: { id } });
  if (!correction) throw notFound('Correction request not found');
  return correction;
}

/** Apply the requested times: create or recompute the Attendance row. */
export async function approveCorrection(
  req: Request,
  user: AuthUser,
  id: string,
  reviewNote?: string,
) {
  const correction = await getCorrectionOrThrow(id);
  if (correction.status !== RequestStatus.PENDING) {
    throw conflict('This correction has already been reviewed');
  }

  const employee = await loadEmployeeWithSchedule(correction.employeeId);
  const schedule = scheduleConfig(employee.schedule);
  const date = startOfDay(correction.date);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: correction.employeeId, date } },
  });

  const timeInValue = correction.requestedTimeIn ?? existing?.timeIn ?? null;
  const timeOutValue = correction.requestedTimeOut ?? existing?.timeOut ?? null;
  const breakInValue = correction.requestedBreakIn ?? existing?.breakIn ?? null;
  const breakOutValue = correction.requestedBreakOut ?? existing?.breakOut ?? null;

  const metrics = computeMetrics(
    date,
    schedule,
    timeInValue,
    timeOutValue,
    breakInValue,
    breakOutValue,
  );

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: correction.employeeId, date } },
    create: {
      employeeId: correction.employeeId,
      date,
      timeIn: timeInValue,
      timeOut: timeOutValue,
      breakIn: breakInValue,
      breakOut: breakOutValue,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      workedMinutes: metrics.workedMinutes,
      status: metrics.status,
      remarks: 'Adjusted via approved correction',
    },
    update: {
      timeIn: timeInValue,
      timeOut: timeOutValue,
      breakIn: breakInValue,
      breakOut: breakOutValue,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      workedMinutes: metrics.workedMinutes,
      status: metrics.status,
      remarks: 'Adjusted via approved correction',
    },
  });

  const updated = await prisma.attendanceCorrection.update({
    where: { id },
    data: {
      status: RequestStatus.APPROVED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
      attendanceId: attendance.id,
    },
  });

  await audit(req, {
    action: 'ATTENDANCE_CORRECTION_APPROVED',
    module: MODULES.ATTENDANCE,
    description: `Approved attendance correction for ${date.toISOString().slice(0, 10)}`,
    employeeId: correction.employeeId,
    newValues: { correctionId: id, attendanceId: attendance.id },
  });

  // Employee timeline event.
  await prisma.employeeActivityTimeline.create({
    data: {
      employeeId: correction.employeeId,
      eventType: TimelineEventType.ATTENDANCE_CORRECTION_APPROVED,
      description: `Attendance correction approved for ${date.toISOString().slice(0, 10)}`,
      createdById: user.id,
      metadata: { correctionId: id, attendanceId: attendance.id },
    },
  });

  // Notify the employee.
  const targetUserId = await userIdForEmployee(correction.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: NotificationType.ATTENDANCE,
      title: 'Attendance Correction Approved',
      message: `Your correction for ${date.toISOString().slice(0, 10)} was approved.`,
      link: `/attendance/corrections/${id}`,
    });
  }

  return { correction: updated, attendance };
}

export async function rejectCorrection(
  req: Request,
  user: AuthUser,
  id: string,
  reviewNote?: string,
) {
  const correction = await getCorrectionOrThrow(id);
  if (correction.status !== RequestStatus.PENDING) {
    throw conflict('This correction has already been reviewed');
  }

  const updated = await prisma.attendanceCorrection.update({
    where: { id },
    data: {
      status: RequestStatus.REJECTED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
  });

  await audit(req, {
    action: 'ATTENDANCE_CORRECTION_REJECTED',
    module: MODULES.ATTENDANCE,
    description: `Rejected attendance correction for ${startOfDay(correction.date).toISOString().slice(0, 10)}`,
    employeeId: correction.employeeId,
    newValues: { correctionId: id, reviewNote: reviewNote ?? null },
  });

  const targetUserId = await userIdForEmployee(correction.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: NotificationType.ATTENDANCE,
      title: 'Attendance Correction Rejected',
      message: `Your correction for ${startOfDay(correction.date).toISOString().slice(0, 10)} was rejected.`,
      link: `/attendance/corrections/${id}`,
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────
// Reports (privileged)
// ─────────────────────────────────────────────────────────────

interface ReportFilters {
  employeeId?: string;
  departmentId?: string;
  from?: Date;
  to?: Date;
  year?: number;
  month?: number;
}

interface ReportRow {
  employeeId: string;
  employeeNo: string;
  name: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  onLeaveDays: number;
  halfDays: number;
  holidayDays: number;
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  totalWorkedMinutes: number;
}

function resolveReportRange(filters: ReportFilters): { from: Date; to: Date } {
  let { from, to } = filters;
  if ((!from || !to) && filters.year && filters.month) {
    const month0 = filters.month - 1;
    from = startOfMonth(filters.year, month0);
    to = endOfMonth(filters.year, month0);
  }
  if (!from || !to) {
    throw badRequest('Provide a from/to date range or a year and month', 'RANGE_REQUIRED');
  }
  return { from: startOfDay(from), to: startOfDay(to) };
}

/** Aggregated attendance report grouped by employee. */
export async function report(req: Request, filters: ReportFilters): Promise<ReportRow[]> {
  const { from, to } = resolveReportRange(filters);

  const where: Prisma.AttendanceWhereInput = { date: { gte: from, lte: to } };
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.departmentId) where.employee = { departmentId: filters.departmentId };

  const rows = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeNo: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const byEmployee = new Map<string, ReportRow>();
  for (const row of rows) {
    let agg = byEmployee.get(row.employeeId);
    if (!agg) {
      const profile = row.employee.profile;
      agg = {
        employeeId: row.employeeId,
        employeeNo: row.employee.employeeNo,
        name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : row.employee.employeeNo,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        onLeaveDays: 0,
        halfDays: 0,
        holidayDays: 0,
        totalLateMinutes: 0,
        totalUndertimeMinutes: 0,
        totalWorkedMinutes: 0,
      };
      byEmployee.set(row.employeeId, agg);
    }
    switch (row.status) {
      case AttendanceStatus.PRESENT:
        agg.presentDays += 1;
        break;
      case AttendanceStatus.LATE:
        agg.lateDays += 1;
        break;
      case AttendanceStatus.ABSENT:
        agg.absentDays += 1;
        break;
      case AttendanceStatus.ON_LEAVE:
        agg.onLeaveDays += 1;
        break;
      case AttendanceStatus.HALF_DAY:
        agg.halfDays += 1;
        break;
      case AttendanceStatus.HOLIDAY:
        agg.holidayDays += 1;
        break;
    }
    agg.totalLateMinutes += row.lateMinutes;
    agg.totalUndertimeMinutes += row.undertimeMinutes;
    agg.totalWorkedMinutes += row.workedMinutes;
  }

  const result = Array.from(byEmployee.values());

  await audit(req, {
    action: 'ATTENDANCE_REPORT_VIEWED',
    module: MODULES.REPORT,
    description: `Viewed attendance report (${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)})`,
    newValues: { employees: result.length },
  });

  return result;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV export of the aggregated attendance report. */
export async function reportCsv(req: Request, filters: ReportFilters): Promise<string> {
  const rows = await report(req, filters);

  const header = [
    'Employee No',
    'Name',
    'Present',
    'Late',
    'Absent',
    'On Leave',
    'Half Day',
    'Holiday',
    'Late Minutes',
    'Undertime Minutes',
    'Worked Minutes',
  ];

  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.employeeNo,
        r.name,
        r.presentDays,
        r.lateDays,
        r.absentDays,
        r.onLeaveDays,
        r.halfDays,
        r.holidayDays,
        r.totalLateMinutes,
        r.totalUndertimeMinutes,
        r.totalWorkedMinutes,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  return lines.join('\n');
}

export interface ActivityEvent {
  id: string;
  type: 'IN' | 'OUT';
  time: Date;
  summary: string | null; // particulars (time-out only)
  date: Date;
  employee: { id: string; name: string; photoUrl: string | null };
}

/**
 * "Today's Activity" — a team-wide feed visible to every employee. Emits an
 * event for each TIME IN and each TIME OUT today (time-outs carry the day's
 * particulars). Newest first.
 *
 * NOTE: this is intentionally NOT per-user scoped — the whole team sees who
 * clocked in/out and what they worked on. All other DTR reads remain self-only.
 */
export async function getActivity(limit = 20): Promise<ActivityEvent[]> {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const today = startOfDay(new Date());

  const rows = await prisma.attendance.findMany({
    where: { date: today, timeIn: { not: null } },
    orderBy: [{ timeOut: 'desc' }, { timeIn: 'desc' }],
    take: 200,
    select: {
      id: true,
      date: true,
      timeIn: true,
      timeOut: true,
      workSummary: true,
      employee: {
        select: {
          id: true,
          employeeNo: true,
          profile: { select: { firstName: true, lastName: true, photoUrl: true } },
        },
      },
    },
  });

  const events: ActivityEvent[] = [];
  for (const r of rows) {
    const employee = {
      id: r.employee.id,
      name: r.employee.profile
        ? `${r.employee.profile.firstName} ${r.employee.profile.lastName}`
        : r.employee.employeeNo,
      photoUrl: r.employee.profile?.photoUrl ?? null,
    };
    if (r.timeIn) {
      events.push({ id: `${r.id}:in`, type: 'IN', time: r.timeIn, summary: null, date: r.date, employee });
    }
    if (r.timeOut) {
      events.push({ id: `${r.id}:out`, type: 'OUT', time: r.timeOut, summary: r.workSummary, date: r.date, employee });
    }
  }

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return events.slice(0, take);
}
