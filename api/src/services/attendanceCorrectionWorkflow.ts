import {
  AttendanceEventSource,
  AttendanceEventType,
  AttendanceStatus,
  RequestStatus,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { atTime, diffMinutes, startOfDay } from '../utils/dateTime';
import { conflict, notFound } from '../utils/errors';

interface ScheduleConfig {
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
}

interface TimeMetrics {
  lateMinutes: number;
  undertimeMinutes: number;
  workedMinutes: number;
  status: AttendanceStatus;
}

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
    const graceCutoff = new Date(atTime(date, schedule.timeIn).getTime() + schedule.gracePeriodMinutes * 60000);
    lateMinutes = diffMinutes(graceCutoff, timeIn);
  }

  if (schedule && timeOut) {
    undertimeMinutes = diffMinutes(timeOut, atTime(date, schedule.timeOut));
  }

  if (timeIn && timeOut) {
    const gross = diffMinutes(timeIn, timeOut);
    let breakDeduction = schedule ? schedule.breakMinutes : 0;
    if (breakIn && breakOut) breakDeduction = diffMinutes(breakIn, breakOut);
    workedMinutes = Math.max(0, gross - breakDeduction);
  }

  const status =
    timeIn && timeOut && workedMinutes > 0 && workedMinutes < 240
      ? AttendanceStatus.HALF_DAY
      : lateMinutes > 0
        ? AttendanceStatus.LATE
        : AttendanceStatus.PRESENT;

  return { lateMinutes, undertimeMinutes, workedMinutes, status };
}

function scheduleConfig(schedule: {
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
} | null): ScheduleConfig | null {
  if (!schedule) return null;
  return {
    timeIn: schedule.timeIn,
    timeOut: schedule.timeOut,
    breakMinutes: schedule.breakMinutes,
    gracePeriodMinutes: schedule.gracePeriodMinutes,
  };
}

export async function applyAttendanceCorrection(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    reviewedById: string;
    reviewedAt?: Date;
    reviewNote?: string | null;
  },
) {
  const correction = await tx.attendanceCorrection.findUnique({ where: { id: input.id } });
  if (!correction) throw notFound('Correction request not found');
  if (correction.status !== RequestStatus.PENDING) {
    throw conflict('This correction has already been reviewed');
  }

  const employee = await tx.employee.findUnique({
    where: { id: correction.employeeId },
    include: { schedule: true },
  });
  if (!employee) throw notFound('Employee not found');

  const date = startOfDay(correction.date);
  const existing = await tx.attendance.findUnique({
    where: { employeeId_date: { employeeId: correction.employeeId, date } },
  });

  const timeInValue = correction.requestedTimeIn ?? existing?.timeIn ?? null;
  const timeOutValue = correction.requestedTimeOut ?? existing?.timeOut ?? null;
  const breakInValue = correction.requestedBreakIn ?? existing?.breakIn ?? null;
  const breakOutValue = correction.requestedBreakOut ?? existing?.breakOut ?? null;
  const metrics = computeMetrics(
    date,
    scheduleConfig(employee.schedule),
    timeInValue,
    timeOutValue,
    breakInValue,
    breakOutValue,
  );

  const attendance = await tx.attendance.upsert({
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

  const reviewedAt = input.reviewedAt ?? new Date();
  const updated = await tx.attendanceCorrection.update({
    where: { id: input.id },
    data: {
      status: RequestStatus.APPROVED,
      reviewedById: input.reviewedById,
      reviewedAt,
      reviewNote: input.reviewNote ?? null,
      attendanceId: attendance.id,
    },
  });

  await tx.attendanceEvent.create({
    data: {
      employeeId: correction.employeeId,
      attendanceId: attendance.id,
      correctionId: input.id,
      eventType: AttendanceEventType.CORRECTION_APPLIED,
      source: AttendanceEventSource.CORRECTION,
      occurredAt: reviewedAt,
      businessDate: date,
      actorUserId: input.reviewedById,
      rawPayload: {
        requestedTimeIn: correction.requestedTimeIn?.toISOString() ?? null,
        requestedTimeOut: correction.requestedTimeOut?.toISOString() ?? null,
        requestedBreakIn: correction.requestedBreakIn?.toISOString() ?? null,
        requestedBreakOut: correction.requestedBreakOut?.toISOString() ?? null,
      },
    },
  });

  await tx.employeeActivityTimeline.create({
    data: {
      employeeId: correction.employeeId,
      eventType: TimelineEventType.ATTENDANCE_CORRECTION_APPROVED,
      description: `Attendance correction approved for ${date.toISOString().slice(0, 10)}`,
      createdById: input.reviewedById,
      metadata: { correctionId: input.id, attendanceId: attendance.id },
    },
  });

  return { correction: updated, attendance };
}

export async function rejectAttendanceCorrection(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    reviewedById: string;
    reviewedAt?: Date;
    reviewNote?: string | null;
  },
) {
  const correction = await tx.attendanceCorrection.findUnique({ where: { id: input.id } });
  if (!correction) throw notFound('Correction request not found');
  if (correction.status !== RequestStatus.PENDING) {
    throw conflict('This correction has already been reviewed');
  }

  return tx.attendanceCorrection.update({
    where: { id: input.id },
    data: {
      status: RequestStatus.REJECTED,
      reviewedById: input.reviewedById,
      reviewedAt: input.reviewedAt ?? new Date(),
      reviewNote: input.reviewNote ?? null,
    },
  });
}
