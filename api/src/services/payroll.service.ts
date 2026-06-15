import type { Request } from 'express';
import {
  Prisma,
  PayrollStatus,
  PayrollItemType,
  AttendanceStatus,
  LeaveStatus,
  EmploymentStatus,
  TimelineEventType,
  NotificationType,
} from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import type { AuthUser, PaginationParams } from '../types';
import { badRequest, conflict, notFound } from '../utils/errors';
import { audit, auditContext, writeAudit } from '../utils/audit';
import { notify } from '../utils/notify';
import { buildMeta, buildOrderBy } from '../utils/pagination';
import { ensureSelfOrPrivileged, isPrivileged } from '../utils/access';
import {
  computePayroll,
  type PayrollInput,
  type PayrollLine,
  type SalaryType,
} from '../utils/payroll';
import { generatePayslipPdf } from '../utils/pdf';
import { uploadBuffer } from '../utils/storage';
import { inclusiveDays, startOfDay } from '../utils/dateTime';

const COMPANY_NAME = 'HR Management System';

/** Default work days when an employee has no schedule: Mon–Fri. */
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

const num = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === 'number' ? d : d.toNumber();

/** Short period key, e.g. "20260601-20260615", for payslip numbers. */
function periodShort(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(start)}-${fmt(end)}`;
}

/** Count scheduled work days in [start,end] given a workDays set (0=Sun…6=Sat). */
function scheduledDaysInRange(start: Date, end: Date, workDays: number[]): number {
  const set = workDays.length ? workDays : DEFAULT_WORK_DAYS;
  const totalDays = inclusiveDays(start, end);
  let count = 0;
  const cursor = startOfDay(start);
  for (let i = 0; i < totalDays; i += 1) {
    if (set.includes(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

type EmployeeFullName = {
  profile: { firstName: string; lastName: string; middleName: string | null } | null;
};

function fullName(emp: EmployeeFullName): string {
  if (!emp.profile) return 'Unknown';
  const { firstName, middleName, lastName } = emp.profile;
  return [firstName, middleName, lastName].filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────
// Aggregation + computation for a single employee in a period
// ─────────────────────────────────────────────────────────────

interface EmployeeForRun {
  id: string;
  employeeNo: string;
  schedule: { workDays: number[] } | null;
  profile: {
    salaryType: SalaryType;
    basicSalary: Prisma.Decimal;
    allowances: Prisma.Decimal;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
}

interface ComputedRun {
  input: PayrollInput;
  result: ReturnType<typeof computePayroll>;
  daysWorked: number;
  absentDays: number;
  lateMinutes: number;
  undertimeMinutes: number;
}

async function aggregateAndCompute(
  employee: EmployeeForRun,
  startDate: Date,
  endDate: Date,
): Promise<ComputedRun> {
  if (!employee.profile) throw badRequest('Employee has no profile to compute payroll from');

  const rangeStart = startOfDay(startDate);
  const rangeEnd = startOfDay(endDate);

  // Attendance aggregates within [start,end].
  const attendances = await prisma.attendance.findMany({
    where: { employeeId: employee.id, date: { gte: rangeStart, lte: rangeEnd } },
    select: { status: true, lateMinutes: true, undertimeMinutes: true },
  });

  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let daysWorked = 0;
  let absentDays = 0;
  for (const a of attendances) {
    lateMinutes += a.lateMinutes;
    undertimeMinutes += a.undertimeMinutes;
    if (
      a.status === AttendanceStatus.PRESENT ||
      a.status === AttendanceStatus.LATE ||
      a.status === AttendanceStatus.HALF_DAY
    ) {
      daysWorked += a.status === AttendanceStatus.HALF_DAY ? 0.5 : 1;
    } else if (a.status === AttendanceStatus.ABSENT) {
      absentDays += 1;
    }
  }

  // Unpaid leave days: APPROVED leave whose type is not paid, overlapping the range.
  const unpaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: employee.id,
      status: LeaveStatus.APPROVED,
      leaveType: { isPaid: false },
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    select: { days: true },
  });
  const unpaidLeaveDays = unpaidLeaves.reduce((sum, l) => sum + num(l.days), 0);

  const standardDaysInPeriod = scheduledDaysInRange(
    startDate,
    endDate,
    employee.schedule?.workDays ?? [],
  );

  const input: PayrollInput = {
    salaryType: employee.profile.salaryType,
    basicSalary: num(employee.profile.basicSalary),
    allowances: num(employee.profile.allowances),
    standardDaysInPeriod,
    daysWorked,
    absentDays,
    unpaidLeaveDays,
    lateMinutes,
    undertimeMinutes,
    overtimeHours: 0,
  };

  const result = computePayroll(input);
  return { input, result, daysWorked, absentDays, lateMinutes, undertimeMinutes };
}

function itemsCreateData(items: PayrollLine[]) {
  return items.map((i) => ({
    type: i.type === 'EARNING' ? PayrollItemType.EARNING : PayrollItemType.DEDUCTION,
    code: i.code,
    label: i.label,
    amount: new Prisma.Decimal(i.amount),
  }));
}

/** Build the Payroll row data (excluding period/employee linkage) from a run. */
function payrollData(run: ComputedRun, status: PayrollStatus) {
  return {
    status,
    daysWorked: new Prisma.Decimal(run.daysWorked),
    lateMinutes: run.lateMinutes,
    undertimeMinutes: run.undertimeMinutes,
    absentDays: new Prisma.Decimal(run.absentDays),
    overtimeHours: new Prisma.Decimal(run.input.overtimeHours),
    basicPay: new Prisma.Decimal(run.result.basicPay),
    grossPay: new Prisma.Decimal(run.result.grossPay),
    totalDeductions: new Prisma.Decimal(run.result.totalDeductions),
    netPay: new Prisma.Decimal(run.result.netPay),
  };
}

// ─────────────────────────────────────────────────────────────
// Processing
// ─────────────────────────────────────────────────────────────

interface ProcessInput {
  name: string;
  startDate: Date;
  endDate: Date;
  payDate?: Date;
}

export async function processPayroll(req: Request, user: AuthUser, data: ProcessInput) {
  const existing = await prisma.payrollPeriod.findUnique({
    where: { startDate_endDate: { startDate: data.startDate, endDate: data.endDate } },
  });
  if (existing) {
    throw conflict('A payroll period already exists for this date range');
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      payDate: data.payDate ?? null,
      status: PayrollStatus.PROCESSING,
      createdById: user.id,
    },
  });

  const employees = await prisma.employee.findMany({
    where: {
      employmentStatus: EmploymentStatus.ACTIVE,
      deletedAt: null,
      profile: { isNot: null },
    },
    select: {
      id: true,
      employeeNo: true,
      schedule: { select: { workDays: true } },
      profile: {
        select: {
          salaryType: true,
          basicSalary: true,
          allowances: true,
          firstName: true,
          middleName: true,
          lastName: true,
        },
      },
    },
  });

  const short = periodShort(data.startDate, data.endDate);
  let processed = 0;

  for (const employee of employees) {
    const run = await aggregateAndCompute(employee, data.startDate, data.endDate);

    await prisma.payroll.create({
      data: {
        periodId: period.id,
        employeeId: employee.id,
        ...payrollData(run, PayrollStatus.COMPLETED),
        items: { create: itemsCreateData(run.result.items) },
        payslip: {
          create: {
            payslipNo: `PS-${short}-${employee.employeeNo}`,
          },
        },
      },
    });

    processed += 1;

    await prisma.employeeActivityTimeline.create({
      data: {
        employeeId: employee.id,
        eventType: TimelineEventType.PAYROLL_PROCESSED,
        description: `Payroll processed for period "${period.name}"`,
        metadata: { periodId: period.id, netPay: run.result.netPay },
        createdById: user.id,
      },
    });
  }

  const completed = await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: { status: PayrollStatus.COMPLETED },
  });

  await audit(req, {
    action: 'PAYROLL_PROCESSED',
    module: MODULES.PAYROLL,
    description: `Processed payroll period "${period.name}" for ${processed} employee(s)`,
    newValues: { periodId: period.id, employees: processed },
  });

  return { period: completed, processed };
}

// ─────────────────────────────────────────────────────────────
// Listing & detail
// ─────────────────────────────────────────────────────────────

interface ListPeriodsFilters {
  status?: PayrollStatus;
}

export async function listPeriods(params: PaginationParams, filters: ListPeriodsFilters) {
  const where: Prisma.PayrollPeriodWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (params.search) {
    where.name = { contains: params.search, mode: 'insensitive' };
  }

  const orderBy = buildOrderBy(
    params,
    ['name', 'startDate', 'endDate', 'payDate', 'status', 'createdAt'],
    'createdAt',
  );

  const [total, periods] = await Promise.all([
    prisma.payrollPeriod.count({ where }),
    prisma.payrollPeriod.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: { _count: { select: { payrolls: true } } },
    }),
  ]);

  const items = periods.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    payDate: p.payDate,
    status: p.status,
    payrollCount: p._count.payrolls,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return { items, meta: buildMeta(total, params) };
}

export async function getPeriod(id: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      payrolls: {
        include: {
          items: true,
          payslip: true,
          employee: {
            select: {
              id: true,
              employeeNo: true,
              profile: { select: { firstName: true, middleName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!period) throw notFound('Payroll period not found');

  return {
    id: period.id,
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    payDate: period.payDate,
    status: period.status,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
    payrolls: period.payrolls.map((pr) => ({
      id: pr.id,
      employeeId: pr.employeeId,
      employeeNo: pr.employee.employeeNo,
      employeeName: fullName(pr.employee),
      status: pr.status,
      daysWorked: num(pr.daysWorked),
      lateMinutes: pr.lateMinutes,
      undertimeMinutes: pr.undertimeMinutes,
      absentDays: num(pr.absentDays),
      overtimeHours: num(pr.overtimeHours),
      basicPay: num(pr.basicPay),
      grossPay: num(pr.grossPay),
      totalDeductions: num(pr.totalDeductions),
      netPay: num(pr.netPay),
      items: pr.items.map((it) => ({
        type: it.type,
        code: it.code,
        label: it.label,
        amount: num(it.amount),
      })),
      payslip: pr.payslip
        ? { id: pr.payslip.id, payslipNo: pr.payslip.payslipNo, releasedAt: pr.payslip.releasedAt }
        : null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Recalculate
// ─────────────────────────────────────────────────────────────

export async function recalculatePeriod(req: Request, user: AuthUser, id: string) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) throw notFound('Payroll period not found');
  if (period.status === PayrollStatus.RELEASED || period.status === PayrollStatus.CANCELLED) {
    throw badRequest(`Cannot recalculate a ${period.status.toLowerCase()} payroll period`);
  }

  const payrolls = await prisma.payroll.findMany({
    where: { periodId: id },
    include: {
      employee: {
        select: {
          id: true,
          employeeNo: true,
          schedule: { select: { workDays: true } },
          profile: {
            select: {
              salaryType: true,
              basicSalary: true,
              allowances: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  let recalculated = 0;
  for (const pr of payrolls) {
    if (!pr.employee.profile) continue;
    const run = await aggregateAndCompute(pr.employee, period.startDate, period.endDate);

    await prisma.$transaction([
      prisma.payrollItem.deleteMany({ where: { payrollId: pr.id } }),
      prisma.payroll.update({
        where: { id: pr.id },
        data: {
          ...payrollData(run, PayrollStatus.COMPLETED),
          items: { create: itemsCreateData(run.result.items) },
        },
      }),
    ]);
    recalculated += 1;
  }

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: PayrollStatus.COMPLETED },
  });

  await audit(req, {
    action: 'PAYROLL_RECALCULATED',
    module: MODULES.PAYROLL,
    description: `Recalculated payroll period "${period.name}" (${recalculated} payroll(s))`,
    userId: user.id,
    newValues: { periodId: id, recalculated },
  });

  return { period: updated, recalculated };
}

// ─────────────────────────────────────────────────────────────
// Release / Cancel
// ─────────────────────────────────────────────────────────────

export async function releasePeriod(req: Request, id: string) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) throw notFound('Payroll period not found');
  if (period.status === PayrollStatus.CANCELLED) {
    throw badRequest('Cannot release a cancelled payroll period');
  }
  if (period.status === PayrollStatus.RELEASED) {
    throw conflict('Payroll period is already released');
  }

  const now = new Date();
  const payrolls = await prisma.payroll.findMany({
    where: { periodId: id },
    select: { id: true, employeeId: true, payslip: { select: { id: true } } },
  });

  await prisma.$transaction([
    prisma.payrollPeriod.update({ where: { id }, data: { status: PayrollStatus.RELEASED } }),
    prisma.payroll.updateMany({ where: { periodId: id }, data: { status: PayrollStatus.RELEASED } }),
    prisma.payslip.updateMany({
      where: { payroll: { periodId: id } },
      data: { releasedAt: now },
    }),
  ]);

  // Notify each employee whose payroll was released.
  for (const pr of payrolls) {
    const userId = await prisma.employee
      .findUnique({ where: { id: pr.employeeId }, select: { userId: true } })
      .then((e) => e?.userId ?? null);
    if (userId) {
      await notify({
        userId,
        type: NotificationType.PAYROLL,
        title: 'Payslip released',
        message: `Your payslip for "${period.name}" is now available.`,
        link: pr.payslip ? `/payslips/${pr.payslip.id}` : undefined,
      });
    }
  }

  const updated = await prisma.payrollPeriod.findUnique({ where: { id } });

  await audit(req, {
    action: 'PAYROLL_RELEASED',
    module: MODULES.PAYROLL,
    description: `Released payroll period "${period.name}" (${payrolls.length} payslip(s))`,
    newValues: { periodId: id, released: payrolls.length },
  });

  return updated;
}

export async function cancelPeriod(req: Request, id: string) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) throw notFound('Payroll period not found');
  if (period.status === PayrollStatus.CANCELLED) {
    throw conflict('Payroll period is already cancelled');
  }

  await prisma.$transaction([
    prisma.payrollPeriod.update({ where: { id }, data: { status: PayrollStatus.CANCELLED } }),
    prisma.payroll.updateMany({ where: { periodId: id }, data: { status: PayrollStatus.CANCELLED } }),
  ]);

  const updated = await prisma.payrollPeriod.findUnique({ where: { id } });

  await audit(req, {
    action: 'PAYROLL_CANCELLED',
    module: MODULES.PAYROLL,
    description: `Cancelled payroll period "${period.name}"`,
    newValues: { periodId: id },
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────
// Payslips for a period
// ─────────────────────────────────────────────────────────────

export async function getPeriodPayslips(id: string) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id }, select: { id: true } });
  if (!period) throw notFound('Payroll period not found');

  const payslips = await prisma.payslip.findMany({
    where: { payroll: { periodId: id } },
    include: {
      payroll: {
        select: {
          id: true,
          employeeId: true,
          netPay: true,
          grossPay: true,
          employee: {
            select: {
              employeeNo: true,
              profile: { select: { firstName: true, middleName: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return payslips.map((p) => ({
    id: p.id,
    payslipNo: p.payslipNo,
    payrollId: p.payrollId,
    employeeId: p.payroll.employeeId,
    employeeNo: p.payroll.employee.employeeNo,
    employeeName: fullName(p.payroll.employee),
    grossPay: num(p.payroll.grossPay),
    netPay: num(p.payroll.netPay),
    generatedAt: p.generatedAt,
    releasedAt: p.releasedAt,
  }));
}

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

interface ReportFilters {
  status?: PayrollStatus;
  periodId?: string;
  startDate?: Date;
  endDate?: Date;
}

function reportWhere(filters: ReportFilters): Prisma.PayrollWhereInput {
  const where: Prisma.PayrollWhereInput = {};
  if (filters.periodId) where.periodId = filters.periodId;
  if (filters.status) where.status = filters.status;
  if (filters.startDate || filters.endDate) {
    where.period = {
      ...(filters.startDate ? { startDate: { gte: startOfDay(filters.startDate) } } : {}),
      ...(filters.endDate ? { endDate: { lte: startOfDay(filters.endDate) } } : {}),
    };
  }
  return where;
}

export async function getReports(filters: ReportFilters) {
  const where = reportWhere(filters);

  const [agg, count, byPeriod] = await Promise.all([
    prisma.payroll.aggregate({
      where,
      _sum: { grossPay: true, totalDeductions: true, netPay: true, basicPay: true },
    }),
    prisma.payroll.count({ where }),
    prisma.payroll.groupBy({
      by: ['periodId'],
      where,
      _sum: { grossPay: true, totalDeductions: true, netPay: true },
      _count: { _all: true },
    }),
  ]);

  const periodIds = byPeriod.map((b) => b.periodId);
  const periods = await prisma.payrollPeriod.findMany({
    where: { id: { in: periodIds } },
    select: { id: true, name: true, startDate: true, endDate: true, status: true },
  });
  const periodMap = new Map(periods.map((p) => [p.id, p]));

  return {
    totals: {
      payrollCount: count,
      basicPay: num(agg._sum.basicPay),
      grossPay: num(agg._sum.grossPay),
      totalDeductions: num(agg._sum.totalDeductions),
      netPay: num(agg._sum.netPay),
    },
    byPeriod: byPeriod.map((b) => {
      const p = periodMap.get(b.periodId);
      return {
        periodId: b.periodId,
        periodName: p?.name ?? null,
        startDate: p?.startDate ?? null,
        endDate: p?.endDate ?? null,
        status: p?.status ?? null,
        payrollCount: b._count._all,
        grossPay: num(b._sum.grossPay),
        totalDeductions: num(b._sum.totalDeductions),
        netPay: num(b._sum.netPay),
      };
    }),
  };
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportReportsCsv(filters: ReportFilters): Promise<string> {
  const where = reportWhere(filters);

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      period: { select: { name: true, startDate: true, endDate: true } },
      employee: {
        select: {
          employeeNo: true,
          profile: { select: { firstName: true, middleName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ periodId: 'asc' }, { createdAt: 'asc' }],
  });

  const header = [
    'Period',
    'Start Date',
    'End Date',
    'Employee No',
    'Employee Name',
    'Status',
    'Days Worked',
    'Late Minutes',
    'Undertime Minutes',
    'Absent Days',
    'Overtime Hours',
    'Basic Pay',
    'Gross Pay',
    'Total Deductions',
    'Net Pay',
  ];

  const rows = payrolls.map((pr) =>
    [
      pr.period.name,
      pr.period.startDate.toISOString().slice(0, 10),
      pr.period.endDate.toISOString().slice(0, 10),
      pr.employee.employeeNo,
      fullName(pr.employee),
      pr.status,
      num(pr.daysWorked),
      pr.lateMinutes,
      pr.undertimeMinutes,
      num(pr.absentDays),
      num(pr.overtimeHours),
      num(pr.basicPay),
      num(pr.grossPay),
      num(pr.totalDeductions),
      num(pr.netPay),
    ]
      .map(csvEscape)
      .join(','),
  );

  return [header.map(csvEscape).join(','), ...rows].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Payslips (self / privileged)
// ─────────────────────────────────────────────────────────────

interface ListPayslipsFilters {
  periodId?: string;
}

export async function listPayslips(
  user: AuthUser,
  params: PaginationParams,
  filters: ListPayslipsFilters,
) {
  const where: Prisma.PayslipWhereInput = {};
  const payrollWhere: Prisma.PayrollWhereInput = {};

  if (!isPrivileged(user)) {
    // Employees only see their own payslips, and only once released.
    payrollWhere.employee = { userId: user.id };
    where.releasedAt = { not: null };
  }
  if (filters.periodId) payrollWhere.periodId = filters.periodId;
  if (Object.keys(payrollWhere).length) where.payroll = payrollWhere;

  if (params.search) {
    where.payslipNo = { contains: params.search, mode: 'insensitive' };
  }

  const orderBy = buildOrderBy(params, ['payslipNo', 'generatedAt', 'releasedAt', 'createdAt'], 'createdAt');

  const [total, payslips] = await Promise.all([
    prisma.payslip.count({ where }),
    prisma.payslip.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        payroll: {
          select: {
            id: true,
            employeeId: true,
            netPay: true,
            grossPay: true,
            period: { select: { id: true, name: true } },
            employee: {
              select: {
                employeeNo: true,
                profile: { select: { firstName: true, middleName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items = payslips.map((p) => ({
    id: p.id,
    payslipNo: p.payslipNo,
    payrollId: p.payrollId,
    employeeId: p.payroll.employeeId,
    employeeNo: p.payroll.employee.employeeNo,
    employeeName: fullName(p.payroll.employee),
    periodId: p.payroll.period.id,
    periodName: p.payroll.period.name,
    grossPay: num(p.payroll.grossPay),
    netPay: num(p.payroll.netPay),
    generatedAt: p.generatedAt,
    releasedAt: p.releasedAt,
  }));

  return { items, meta: buildMeta(total, params) };
}

/** Load a payslip with full relations, enforcing owner-or-privileged access. */
async function loadPayslipForUser(user: AuthUser, id: string) {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      payroll: {
        include: {
          items: true,
          period: { select: { id: true, name: true, startDate: true, endDate: true, payDate: true } },
          employee: {
            select: {
              id: true,
              employeeNo: true,
              department: { select: { name: true } },
              position: { select: { title: true } },
              profile: { select: { firstName: true, middleName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!payslip) throw notFound('Payslip not found');

  ensureSelfOrPrivileged(user, payslip.payroll.employeeId);

  // Employees may only see a payslip once it has been released.
  if (!isPrivileged(user) && !payslip.releasedAt) {
    throw notFound('Payslip not found');
  }

  return payslip;
}

export async function getPayslip(req: Request, user: AuthUser, id: string) {
  const payslip = await loadPayslipForUser(user, id);
  const pr = payslip.payroll;

  await writeAudit({
    userId: user.id,
    employeeId: pr.employeeId,
    action: 'PAYSLIP_VIEWED',
    module: MODULES.PAYROLL,
    description: `Viewed payslip ${payslip.payslipNo}`,
    ...auditContext(req),
  });

  return {
    id: payslip.id,
    payslipNo: payslip.payslipNo,
    fileUrl: payslip.fileUrl,
    generatedAt: payslip.generatedAt,
    releasedAt: payslip.releasedAt,
    period: pr.period,
    employee: {
      id: pr.employee.id,
      employeeNo: pr.employee.employeeNo,
      name: fullName(pr.employee),
      department: pr.employee.department?.name ?? null,
      position: pr.employee.position?.title ?? null,
    },
    payroll: {
      id: pr.id,
      status: pr.status,
      daysWorked: num(pr.daysWorked),
      lateMinutes: pr.lateMinutes,
      undertimeMinutes: pr.undertimeMinutes,
      absentDays: num(pr.absentDays),
      overtimeHours: num(pr.overtimeHours),
      basicPay: num(pr.basicPay),
      grossPay: num(pr.grossPay),
      totalDeductions: num(pr.totalDeductions),
      netPay: num(pr.netPay),
      items: pr.items.map((it) => ({
        type: it.type,
        code: it.code,
        label: it.label,
        amount: num(it.amount),
      })),
    },
  };
}

export interface PayslipDownload {
  buffer: Buffer;
  filename: string;
}

export async function downloadPayslip(
  req: Request,
  user: AuthUser,
  id: string,
): Promise<PayslipDownload> {
  const payslip = await loadPayslipForUser(user, id);
  const pr = payslip.payroll;

  const earnings = pr.items
    .filter((i) => i.type === PayrollItemType.EARNING)
    .map((i) => ({ label: i.label, amount: num(i.amount) }));
  const deductions = pr.items
    .filter((i) => i.type === PayrollItemType.DEDUCTION)
    .map((i) => ({ label: i.label, amount: num(i.amount) }));

  const buffer = await generatePayslipPdf({
    payslipNo: payslip.payslipNo,
    companyName: COMPANY_NAME,
    periodName: pr.period.name,
    payDate: pr.period.payDate ? pr.period.payDate.toISOString().slice(0, 10) : undefined,
    employeeName: fullName(pr.employee),
    employeeNo: pr.employee.employeeNo,
    department: pr.employee.department?.name ?? undefined,
    position: pr.employee.position?.title ?? undefined,
    earnings,
    deductions,
    grossPay: num(pr.grossPay),
    totalDeductions: num(pr.totalDeductions),
    netPay: num(pr.netPay),
  });

  // Best-effort: persist the generated PDF to storage if configured.
  try {
    const path = `payslips/${pr.employeeId}/${payslip.payslipNo}.pdf`;
    const stored = await uploadBuffer(path, buffer, 'application/pdf');
    if (!payslip.filePath) {
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: { filePath: stored.path, fileUrl: stored.url },
      });
    }
  } catch {
    // Storage is optional for downloads — ignore failures and still return the PDF.
  }

  await writeAudit({
    userId: user.id,
    employeeId: pr.employeeId,
    action: 'PAYSLIP_DOWNLOADED',
    module: MODULES.PAYROLL,
    description: `Downloaded payslip ${payslip.payslipNo}`,
    ...auditContext(req),
  });

  return { buffer, filename: `${payslip.payslipNo}.pdf` };
}
