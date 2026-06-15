import type { Request } from 'express';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import type { AuthUser } from '../types';
import { ensureSelfOrPrivileged } from '../utils/access';
import { notFound } from '../utils/errors';
import { audit } from '../utils/audit';
import { startOfDay } from '../utils/dateTime';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Midnight (server-local) of today, used to key @db.Date attendance/appointment rows. */
function today(): Date {
  return startOfDay(new Date());
}

/** First moment of the current calendar month. */
function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Last moment of the current calendar month. */
function monthEnd(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Decimal → number (Prisma Decimal values are runtime objects with toString). */
function toNum(v: { toString(): string } | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v.toString());
}

// ─────────────────────────────────────────────────────────────
// Profile completion
// ─────────────────────────────────────────────────────────────

/** Profile fields that contribute to the "personal info" completeness score. */
const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'civilStatus',
  'nationality',
  'contactNumber',
  'email',
  'currentAddress',
  'permanentAddress',
  'photoUrl',
] as const;

interface ProfileCompletion {
  percentage: number;
  filledFields: number;
  totalFields: number;
  sections: {
    personal: boolean;
    emergencyContacts: boolean;
    dependents: boolean;
    education: boolean;
    workExperience: boolean;
    skills: boolean;
    documents: boolean;
  };
}

/**
 * Profile completion is the share of completed checkpoints across the personal
 * profile fields plus presence of each background sub-resource group.
 */
async function computeProfileCompletion(employeeId: string): Promise<ProfileCompletion> {
  const [profile, emergencyContacts, dependents, education, workExperience, skills, documents] =
    await Promise.all([
      prisma.employeeProfile.findUnique({ where: { employeeId } }),
      prisma.employeeEmergencyContact.count({ where: { employeeId } }),
      prisma.employeeDependent.count({ where: { employeeId } }),
      prisma.employeeEducation.count({ where: { employeeId } }),
      prisma.employeeWorkExperience.count({ where: { employeeId } }),
      prisma.employeeSkill.count({ where: { employeeId } }),
      prisma.employeeDocument.count({ where: { employeeId, deletedAt: null } }),
    ]);

  const filledProfileFields = profile
    ? PROFILE_FIELDS.filter((f) => {
        const value = (profile as Record<string, unknown>)[f];
        return value !== null && value !== undefined && String(value).trim() !== '';
      }).length
    : 0;

  const sections = {
    personal: filledProfileFields > 0,
    emergencyContacts: emergencyContacts > 0,
    dependents: dependents > 0,
    education: education > 0,
    workExperience: workExperience > 0,
    skills: skills > 0,
    documents: documents > 0,
  };

  // Total checkpoints = personal fields + one per sub-resource section.
  const sectionCount = Object.keys(sections).length - 1; // exclude `personal`
  const totalFields = PROFILE_FIELDS.length + sectionCount;
  const filledSections = [
    emergencyContacts,
    dependents,
    education,
    workExperience,
    skills,
    documents,
  ].filter((c) => c > 0).length;
  const filledFields = filledProfileFields + filledSections;

  const percentage = totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);

  return { percentage, filledFields, totalFields, sections };
}

// ─────────────────────────────────────────────────────────────
// Employee dashboard
// ─────────────────────────────────────────────────────────────

export async function getEmployeeDashboard(user: AuthUser, _req: Request) {
  const employeeId = user.employeeId;
  if (!employeeId) throw notFound('No employee record is linked to your account');

  // Record-scope guard: an employee only ever reads their own dashboard.
  ensureSelfOrPrivileged(user, employeeId);

  const day = today();
  const from = monthStart();
  const to = monthEnd();
  const year = new Date().getFullYear();

  const [
    todayAttendance,
    monthGroups,
    leaveBalances,
    upcomingAppointments,
    latestPayroll,
    unreadNotifications,
    profileCompletion,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
      select: {
        id: true,
        date: true,
        timeIn: true,
        timeOut: true,
        breakIn: true,
        breakOut: true,
        status: true,
        lateMinutes: true,
        undertimeMinutes: true,
        workedMinutes: true,
      },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { employeeId, date: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
      orderBy: { leaveType: { name: 'asc' } },
    }),
    prisma.appointment.count({
      where: {
        employeeId,
        scheduledDate: { gte: day },
        status: { in: ['PENDING', 'APPROVED', 'RESCHEDULED'] },
      },
    }),
    prisma.payroll.findFirst({
      where: { employeeId },
      orderBy: { period: { endDate: 'desc' } },
      include: {
        period: { select: { id: true, name: true, startDate: true, endDate: true, payDate: true } },
        payslip: { select: { id: true, payslipNo: true, releasedAt: true } },
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    computeProfileCompletion(employeeId),
  ]);

  const countByStatus = (status: string): number =>
    monthGroups.find((g) => g.status === status)?._count._all ?? 0;

  const attendanceSummary = {
    present: countByStatus('PRESENT'),
    late: countByStatus('LATE'),
    absent: countByStatus('ABSENT'),
    onLeave: countByStatus('ON_LEAVE'),
    halfDay: countByStatus('HALF_DAY'),
    holiday: countByStatus('HOLIDAY'),
  };

  // Time-in/out shortcut state — what action the clock widget should offer next.
  const hasTimedIn = Boolean(todayAttendance?.timeIn);
  const hasTimedOut = Boolean(todayAttendance?.timeOut);
  const timeClock = {
    hasTimedIn,
    hasTimedOut,
    canTimeIn: !hasTimedIn,
    canTimeOut: hasTimedIn && !hasTimedOut,
    timeIn: todayAttendance?.timeIn ?? null,
    timeOut: todayAttendance?.timeOut ?? null,
    nextAction: !hasTimedIn ? 'TIME_IN' : !hasTimedOut ? 'TIME_OUT' : 'DONE',
  };

  const leaveBalanceSummary = leaveBalances.map((b) => {
    const entitled = toNum(b.entitled);
    const used = toNum(b.used);
    return {
      leaveTypeId: b.leaveTypeId,
      leaveType: b.leaveType.name,
      isPaid: b.leaveType.isPaid,
      year: b.year,
      entitled,
      used,
      remaining: Math.max(0, entitled - used),
    };
  });

  const latestPayslip = latestPayroll
    ? {
        payrollId: latestPayroll.id,
        period: latestPayroll.period?.name ?? null,
        startDate: latestPayroll.period?.startDate ?? null,
        endDate: latestPayroll.period?.endDate ?? null,
        payDate: latestPayroll.period?.payDate ?? null,
        netPay: toNum(latestPayroll.netPay),
        status: latestPayroll.status,
        payslipNo: latestPayroll.payslip?.payslipNo ?? null,
        releasedAt: latestPayroll.payslip?.releasedAt ?? null,
      }
    : null;

  return {
    today: {
      date: day,
      attendance: todayAttendance,
      status: todayAttendance?.status ?? 'ABSENT',
    },
    timeClock,
    attendanceSummary,
    leaveBalanceSummary,
    appointmentSummary: { upcoming: upcomingAppointments },
    latestPayslip,
    unreadNotifications,
    profileCompletion,
  };
}

// ─────────────────────────────────────────────────────────────
// Admin dashboard
// ─────────────────────────────────────────────────────────────

interface AdminDashboardOptions {
  trendDays?: number;
  activityLimit?: number;
}

export async function getAdminDashboard(
  user: AuthUser,
  req: Request,
  opts: AdminDashboardOptions = {},
) {
  const trendDays = opts.trendDays ?? 7;
  const activityLimit = opts.activityLimit ?? 10;
  const day = today();

  const [
    totalEmployees,
    activeEmployees,
    lateToday,
    absentToday,
    pendingLeave,
    pendingCorrections,
    pendingAppointments,
    currentPeriod,
    recentActivities,
    headcountByDepartment,
  ] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null, employmentStatus: 'ACTIVE' } }),
    prisma.attendance.count({ where: { date: day, status: 'LATE' } }),
    prisma.attendance.count({ where: { date: day, status: 'ABSENT' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendanceCorrection.count({ where: { status: 'PENDING' } }),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
    prisma.payrollPeriod.findFirst({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        payDate: true,
        status: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: activityLimit,
      select: {
        id: true,
        action: true,
        module: true,
        description: true,
        employeeId: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const attendanceTrend = await buildAttendanceTrend(trendDays);
  const headcount = await resolveDepartmentNames(headcountByDepartment);

  await audit(req, {
    userId: user.id,
    action: 'VIEW_ADMIN_DASHBOARD',
    module: MODULES.REPORT,
    description: 'Viewed admin dashboard',
  });

  return {
    totals: {
      totalEmployees,
      activeEmployees,
      lateToday,
      absentToday,
      pendingLeaveRequests: pendingLeave,
      pendingAttendanceCorrections: pendingCorrections,
      pendingAppointments,
    },
    payroll: {
      current: currentPeriod,
    },
    recentActivities,
    charts: {
      attendanceTrend,
      headcountByDepartment: headcount,
    },
  };
}

/** Attendance trend: per-day status counts for the trailing `days` window. */
async function buildAttendanceTrend(days: number) {
  const end = today();
  const start = startOfDay(new Date(end.getTime() - (days - 1) * 86400000));

  const groups = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where: { date: { gte: start, lte: end } },
    _count: { _all: true },
  });

  const byDate = new Map<string, { present: number; late: number; absent: number }>();
  for (let i = 0; i < days; i += 1) {
    const d = startOfDay(new Date(start.getTime() + i * 86400000));
    byDate.set(d.toISOString().slice(0, 10), { present: 0, late: 0, absent: 0 });
  }

  for (const g of groups) {
    const key = new Date(g.date).toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    if (g.status === 'PRESENT') bucket.present += g._count._all;
    else if (g.status === 'LATE') bucket.late += g._count._all;
    else if (g.status === 'ABSENT') bucket.absent += g._count._all;
  }

  return Array.from(byDate.entries()).map(([date, counts]) => ({ date, ...counts }));
}

/** Map departmentId groupBy results to labelled headcount entries. */
async function resolveDepartmentNames(
  groups: { departmentId: string | null; _count: { _all: number } }[],
) {
  const ids = groups.map((g) => g.departmentId).filter((id): id is string => id !== null);
  const departments = ids.length
    ? await prisma.department.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(departments.map((d) => [d.id, d.name]));

  return groups.map((g) => ({
    departmentId: g.departmentId,
    department: g.departmentId ? nameById.get(g.departmentId) ?? 'Unknown' : 'Unassigned',
    count: g._count._all,
  }));
}

// ─────────────────────────────────────────────────────────────
// HR dashboard
// ─────────────────────────────────────────────────────────────

interface HrDashboardOptions {
  expiringWithinDays?: number;
}

export async function getHrDashboard(
  user: AuthUser,
  req: Request,
  opts: HrDashboardOptions = {},
) {
  const expiringWithinDays = opts.expiringWithinDays ?? 30;
  const from = monthStart();
  const to = monthEnd();
  const now = new Date();
  const expiryCutoff = new Date(now.getTime() + expiringWithinDays * 86400000);

  const [
    pendingLeave,
    pendingCorrections,
    pendingProfileUpdateRequests,
    newHires,
    expiringDocuments,
    expiringTrainings,
    headcountByDepartment,
  ] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendanceCorrection.count({ where: { status: 'PENDING' } }),
    prisma.employeeProfileUpdateRequest.count({ where: { status: 'PENDING' } }),
    prisma.employee.count({
      where: { deletedAt: null, dateHired: { gte: from, lte: to } },
    }),
    prisma.employeeDocument.count({
      where: {
        deletedAt: null,
        expirationDate: { not: null, gte: now, lte: expiryCutoff },
      },
    }),
    prisma.employeeTraining.count({
      where: { expirationDate: { not: null, gte: now, lte: expiryCutoff } },
    }),
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const headcount = await resolveDepartmentNames(headcountByDepartment);

  await audit(req, {
    userId: user.id,
    action: 'VIEW_HR_DASHBOARD',
    module: MODULES.REPORT,
    description: 'Viewed HR dashboard',
  });

  return {
    pendingLeaveRequests: pendingLeave,
    pendingAttendanceCorrections: pendingCorrections,
    pendingProfileUpdateRequests,
    newHiresThisMonth: newHires,
    documentExpirations: {
      withinDays: expiringWithinDays,
      documents: expiringDocuments,
      trainings: expiringTrainings,
      total: expiringDocuments + expiringTrainings,
    },
    headcountByDepartment: headcount,
  };
}
