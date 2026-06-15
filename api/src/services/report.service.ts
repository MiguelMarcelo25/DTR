import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import { isPrivileged } from '../utils/access';
import { writeAudit, type AuditEntry } from '../utils/audit';
import { badRequest } from '../utils/errors';
import { startOfDay } from '../utils/dateTime';
import type { AuthUser, PaginationMeta, PaginationParams } from '../types';
import type { ReportType } from '../validations/report.validation';

// ─────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────

export interface ReportFilters {
  from?: Date;
  to?: Date;
  departmentId?: string;
  employeeId?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportDataset {
  /** Stable column order, used by both JSON consumers and CSV/PDF exporters. */
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

interface ListContext {
  user: AuthUser;
  filters: ReportFilters;
  params: PaginationParams;
  audit: Omit<AuditEntry, 'action' | 'module'>;
}

const decimalToNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === 'number' ? d : Number(d.toString());

const dateOnly = (d: Date | null | undefined): string =>
  d ? new Date(d).toISOString().slice(0, 10) : '';

const dateTime = (d: Date | null | undefined): string =>
  d ? new Date(d).toISOString() : '';

const fullName = (p?: { firstName: string; lastName: string; middleName?: string | null } | null) =>
  p ? `${p.lastName}, ${p.firstName}${p.middleName ? ` ${p.middleName}` : ''}` : '';

/** Build an inclusive date range filter for a Prisma date field. */
function dateRange(filters: ReportFilters): Prisma.DateTimeFilter | undefined {
  if (!filters.from && !filters.to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (filters.from) range.gte = startOfDay(filters.from);
  if (filters.to) {
    const end = startOfDay(filters.to);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

/** Constrain a query to employees matching department/employee filters. */
function employeeWhere(filters: ReportFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = { deletedAt: null };
  if (filters.employeeId) where.id = filters.employeeId;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  return where;
}

/** Nested employee relation filter for attendance/leave/etc. */
function relatedEmployeeFilter(filters: ReportFilters): Prisma.EmployeeWhereInput | undefined {
  const where: Prisma.EmployeeWhereInput = {};
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (Object.keys(where).length === 0) return undefined;
  return where;
}

// ─────────────────────────────────────────────────────────────
// Attendance-derived reports
// ─────────────────────────────────────────────────────────────

const attendanceSelect = {
  id: true,
  date: true,
  timeIn: true,
  timeOut: true,
  breakIn: true,
  breakOut: true,
  lateMinutes: true,
  undertimeMinutes: true,
  workedMinutes: true,
  status: true,
  remarks: true,
  employee: {
    select: {
      id: true,
      employeeNo: true,
      department: { select: { id: true, name: true } },
      profile: { select: { firstName: true, middleName: true, lastName: true } },
    },
  },
} satisfies Prisma.AttendanceSelect;

function attendanceWhere(
  filters: ReportFilters,
  extra: Prisma.AttendanceWhereInput = {},
): Prisma.AttendanceWhereInput {
  const where: Prisma.AttendanceWhereInput = { ...extra };
  const range = dateRange(filters);
  if (range) where.date = range;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  const emp = relatedEmployeeFilter(filters);
  if (emp) where.employee = emp;
  return where;
}

type AttendanceRow = Prisma.AttendanceGetPayload<{ select: typeof attendanceSelect }>;

function mapAttendanceRow(a: AttendanceRow) {
  return {
    date: dateOnly(a.date),
    employeeNo: a.employee.employeeNo,
    employeeName: fullName(a.employee.profile),
    department: a.employee.department?.name ?? '',
    status: a.status,
    timeIn: dateTime(a.timeIn),
    timeOut: dateTime(a.timeOut),
    lateMinutes: a.lateMinutes,
    undertimeMinutes: a.undertimeMinutes,
    workedMinutes: a.workedMinutes,
    remarks: a.remarks ?? '',
  };
}

const attendanceColumns: ReportColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'employeeNo', label: 'Employee No' },
  { key: 'employeeName', label: 'Employee' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'timeIn', label: 'Time In' },
  { key: 'timeOut', label: 'Time Out' },
  { key: 'lateMinutes', label: 'Late (min)' },
  { key: 'undertimeMinutes', label: 'Undertime (min)' },
  { key: 'workedMinutes', label: 'Worked (min)' },
  { key: 'remarks', label: 'Remarks' },
];

async function buildAttendance(
  ctx: ListContext,
  extra: Prisma.AttendanceWhereInput,
  columns: ReportColumn[],
): Promise<{ dataset: ReportDataset; total: number }> {
  const where = attendanceWhere(ctx.filters, extra);
  const [total, rows, agg] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      select: attendanceSelect,
      orderBy: [{ date: ctx.params.order }, { id: 'asc' }],
      skip: ctx.params.skip,
      take: ctx.params.take,
    }),
    prisma.attendance.aggregate({
      where,
      _sum: { lateMinutes: true, undertimeMinutes: true, workedMinutes: true },
    }),
  ]);

  return {
    total,
    dataset: {
      columns,
      rows: rows.map(mapAttendanceRow),
      summary: {
        totalRecords: total,
        totalLateMinutes: agg._sum.lateMinutes ?? 0,
        totalUndertimeMinutes: agg._sum.undertimeMinutes ?? 0,
        totalWorkedMinutes: agg._sum.workedMinutes ?? 0,
      },
    },
  };
}

async function attendanceReport(ctx: ListContext) {
  return buildAttendance(ctx, {}, attendanceColumns);
}

async function dtrReport(ctx: ListContext) {
  const dtrColumns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'timeIn', label: 'Time In' },
    { key: 'breakOut', label: 'Break Out' },
    { key: 'breakIn', label: 'Break In' },
    { key: 'timeOut', label: 'Time Out' },
    { key: 'workedMinutes', label: 'Worked (min)' },
  ];
  const where = attendanceWhere(ctx.filters);
  const [total, rows, agg] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      select: attendanceSelect,
      orderBy: [{ date: ctx.params.order }, { id: 'asc' }],
      skip: ctx.params.skip,
      take: ctx.params.take,
    }),
    prisma.attendance.aggregate({ where, _sum: { workedMinutes: true } }),
  ]);

  return {
    total,
    dataset: {
      columns: dtrColumns,
      rows: rows.map((a) => ({
        date: dateOnly(a.date),
        employeeNo: a.employee.employeeNo,
        employeeName: fullName(a.employee.profile),
        department: a.employee.department?.name ?? '',
        status: a.status,
        timeIn: dateTime(a.timeIn),
        breakOut: dateTime(a.breakOut),
        breakIn: dateTime(a.breakIn),
        timeOut: dateTime(a.timeOut),
        workedMinutes: a.workedMinutes,
      })),
      summary: {
        totalRecords: total,
        totalWorkedMinutes: agg._sum.workedMinutes ?? 0,
      },
    },
  };
}

async function lateReport(ctx: ListContext) {
  return buildAttendance(
    ctx,
    { OR: [{ status: 'LATE' }, { lateMinutes: { gt: 0 } }] },
    attendanceColumns,
  );
}

async function undertimeReport(ctx: ListContext) {
  return buildAttendance(ctx, { undertimeMinutes: { gt: 0 } }, attendanceColumns);
}

async function absencesReport(ctx: ListContext) {
  return buildAttendance(ctx, { status: 'ABSENT' }, attendanceColumns);
}

// ─────────────────────────────────────────────────────────────
// Leave report (requests + balance summary)
// ─────────────────────────────────────────────────────────────

async function leaveReport(ctx: ListContext) {
  const { filters, params } = ctx;
  const where: Prisma.LeaveRequestWhereInput = {};
  const range = dateRange(filters);
  if (range) where.startDate = range;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  const emp = relatedEmployeeFilter(filters);
  if (emp) where.employee = emp;

  const columns: ReportColumn[] = [
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ];

  const [total, rows, daysAgg, byStatus] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      select: {
        startDate: true,
        endDate: true,
        days: true,
        status: true,
        reason: true,
        leaveType: { select: { name: true } },
        employee: {
          select: {
            employeeNo: true,
            department: { select: { name: true } },
            profile: { select: { firstName: true, middleName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ startDate: params.order }, { id: 'asc' }],
      skip: params.skip,
      take: params.take,
    }),
    prisma.leaveRequest.aggregate({ where, _sum: { days: true } }),
    prisma.leaveRequest.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  return {
    total,
    dataset: {
      columns,
      rows: rows.map((r) => ({
        employeeNo: r.employee.employeeNo,
        employeeName: fullName(r.employee.profile),
        department: r.employee.department?.name ?? '',
        leaveType: r.leaveType.name,
        startDate: dateOnly(r.startDate),
        endDate: dateOnly(r.endDate),
        days: decimalToNumber(r.days),
        status: r.status,
        reason: r.reason ?? '',
      })),
      summary: {
        totalRequests: total,
        totalDays: decimalToNumber(daysAgg._sum.days),
        byStatus: statusCounts,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Appointments report
// ─────────────────────────────────────────────────────────────

async function appointmentsReport(ctx: ListContext) {
  const { filters, params } = ctx;
  const where: Prisma.AppointmentWhereInput = {};
  const range = dateRange(filters);
  if (range) where.scheduledDate = range;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  const emp = relatedEmployeeFilter(filters);
  if (emp) where.employee = emp;

  const columns: ReportColumn[] = [
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'scheduledDate', label: 'Date' },
    { key: 'scheduledTime', label: 'Time' },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Note' },
  ];

  const [total, rows, byStatus] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      select: {
        purpose: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        note: true,
        employee: {
          select: {
            employeeNo: true,
            department: { select: { name: true } },
            profile: { select: { firstName: true, middleName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ scheduledDate: params.order }, { id: 'asc' }],
      skip: params.skip,
      take: params.take,
    }),
    prisma.appointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  return {
    total,
    dataset: {
      columns,
      rows: rows.map((a) => ({
        employeeNo: a.employee.employeeNo,
        employeeName: fullName(a.employee.profile),
        department: a.employee.department?.name ?? '',
        purpose: a.purpose,
        scheduledDate: dateOnly(a.scheduledDate),
        scheduledTime: a.scheduledTime,
        status: a.status,
        note: a.note ?? '',
      })),
      summary: { totalAppointments: total, byStatus: statusCounts },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Payroll report (totals per period/employee)
// ─────────────────────────────────────────────────────────────

async function payrollReport(ctx: ListContext) {
  const { filters, params } = ctx;
  const where: Prisma.PayrollWhereInput = {};
  if (filters.employeeId) where.employeeId = filters.employeeId;
  const emp = relatedEmployeeFilter(filters);
  if (emp) where.employee = emp;
  const range = dateRange(filters);
  if (range) where.period = { startDate: range };

  const columns: ReportColumn[] = [
    { key: 'period', label: 'Period' },
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'daysWorked', label: 'Days Worked' },
    { key: 'basicPay', label: 'Basic Pay' },
    { key: 'grossPay', label: 'Gross Pay' },
    { key: 'totalDeductions', label: 'Deductions' },
    { key: 'netPay', label: 'Net Pay' },
  ];

  const [total, rows, agg] = await Promise.all([
    prisma.payroll.count({ where }),
    prisma.payroll.findMany({
      where,
      select: {
        status: true,
        daysWorked: true,
        basicPay: true,
        grossPay: true,
        totalDeductions: true,
        netPay: true,
        period: { select: { name: true, startDate: true } },
        employee: {
          select: {
            employeeNo: true,
            department: { select: { name: true } },
            profile: { select: { firstName: true, middleName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ createdAt: params.order }, { id: 'asc' }],
      skip: params.skip,
      take: params.take,
    }),
    prisma.payroll.aggregate({
      where,
      _sum: { basicPay: true, grossPay: true, totalDeductions: true, netPay: true },
    }),
  ]);

  return {
    total,
    dataset: {
      columns,
      rows: rows.map((p) => ({
        period: p.period.name,
        employeeNo: p.employee.employeeNo,
        employeeName: fullName(p.employee.profile),
        department: p.employee.department?.name ?? '',
        status: p.status,
        daysWorked: decimalToNumber(p.daysWorked),
        basicPay: decimalToNumber(p.basicPay),
        grossPay: decimalToNumber(p.grossPay),
        totalDeductions: decimalToNumber(p.totalDeductions),
        netPay: decimalToNumber(p.netPay),
      })),
      summary: {
        totalRecords: total,
        totalBasicPay: decimalToNumber(agg._sum.basicPay),
        totalGrossPay: decimalToNumber(agg._sum.grossPay),
        totalDeductions: decimalToNumber(agg._sum.totalDeductions),
        totalNetPay: decimalToNumber(agg._sum.netPay),
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Employees masterlist
// ─────────────────────────────────────────────────────────────

async function employeesReport(ctx: ListContext) {
  const { user, filters, params } = ctx;
  const privileged = isPrivileged(user);
  const where = employeeWhere(filters);
  const range = dateRange(filters);
  if (range) where.dateHired = range;

  const baseColumns: ReportColumn[] = [
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'branch', label: 'Branch' },
    { key: 'employmentType', label: 'Employment Type' },
    { key: 'employmentStatus', label: 'Status' },
    { key: 'dateHired', label: 'Date Hired' },
    { key: 'email', label: 'Email' },
    { key: 'contactNumber', label: 'Contact' },
  ];
  // Sensitive payroll/government columns only for privileged users.
  const sensitiveColumns: ReportColumn[] = [
    { key: 'salaryType', label: 'Salary Type' },
    { key: 'basicSalary', label: 'Basic Salary' },
    { key: 'allowances', label: 'Allowances' },
    { key: 'taxStatus', label: 'Tax Status' },
    { key: 'tin', label: 'TIN' },
    { key: 'sss', label: 'SSS' },
    { key: 'philhealth', label: 'PhilHealth' },
    { key: 'pagibig', label: 'Pag-IBIG' },
    { key: 'bankName', label: 'Bank' },
    { key: 'bankAccountNumber', label: 'Bank Account' },
  ];
  const columns = privileged ? [...baseColumns, ...sensitiveColumns] : baseColumns;

  const [total, rows, byStatus] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: {
        employeeNo: true,
        employmentType: true,
        employmentStatus: true,
        dateHired: true,
        department: { select: { name: true } },
        position: { select: { title: true } },
        branch: { select: { name: true } },
        profile: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            contactNumber: true,
            salaryType: true,
            basicSalary: true,
            allowances: true,
            taxStatus: true,
            tin: true,
            sss: true,
            philhealth: true,
            pagibig: true,
            bankName: true,
            bankAccountNumber: true,
          },
        },
      },
      orderBy: [{ employeeNo: params.order }],
      skip: params.skip,
      take: params.take,
    }),
    prisma.employee.groupBy({ by: ['employmentStatus'], where, _count: { _all: true } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of byStatus) statusCounts[g.employmentStatus] = g._count._all;

  return {
    total,
    privileged,
    dataset: {
      columns,
      rows: rows.map((e) => {
        const base: Record<string, unknown> = {
          employeeNo: e.employeeNo,
          employeeName: fullName(e.profile),
          department: e.department?.name ?? '',
          position: e.position?.title ?? '',
          branch: e.branch?.name ?? '',
          employmentType: e.employmentType,
          employmentStatus: e.employmentStatus,
          dateHired: dateOnly(e.dateHired),
          email: e.profile?.email ?? '',
          contactNumber: e.profile?.contactNumber ?? '',
        };
        if (privileged) {
          base.salaryType = e.profile?.salaryType ?? '';
          base.basicSalary = decimalToNumber(e.profile?.basicSalary);
          base.allowances = decimalToNumber(e.profile?.allowances);
          base.taxStatus = e.profile?.taxStatus ?? '';
          base.tin = e.profile?.tin ?? '';
          base.sss = e.profile?.sss ?? '';
          base.philhealth = e.profile?.philhealth ?? '';
          base.pagibig = e.profile?.pagibig ?? '';
          base.bankName = e.profile?.bankName ?? '';
          base.bankAccountNumber = e.profile?.bankAccountNumber ?? '';
        }
        return base;
      }),
      summary: { totalEmployees: total, byStatus: statusCounts },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Employee background (profile completeness, docs/skills/trainings counts)
// ─────────────────────────────────────────────────────────────

const PROFILE_COMPLETENESS_FIELDS: (keyof Prisma.EmployeeProfileSelect)[] = [
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
];

async function employeeBackgroundReport(ctx: ListContext) {
  const { filters, params } = ctx;
  const where = employeeWhere(filters);
  const range = dateRange(filters);
  if (range) where.dateHired = range;

  const columns: ReportColumn[] = [
    { key: 'employeeNo', label: 'Employee No' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'profileCompleteness', label: 'Profile %' },
    { key: 'documents', label: 'Documents' },
    { key: 'skills', label: 'Skills' },
    { key: 'trainings', label: 'Trainings' },
    { key: 'education', label: 'Education' },
    { key: 'workExperience', label: 'Work Experience' },
  ];

  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: {
        employeeNo: true,
        department: { select: { name: true } },
        profile: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            civilStatus: true,
            nationality: true,
            contactNumber: true,
            email: true,
            currentAddress: true,
            permanentAddress: true,
          },
        },
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            skills: true,
            trainings: true,
            education: true,
            workExperience: true,
          },
        },
      },
      orderBy: [{ employeeNo: params.order }],
      skip: params.skip,
      take: params.take,
    }),
  ]);

  const mapped = rows.map((e) => {
    const p = e.profile;
    let filled = 0;
    if (p) {
      for (const field of PROFILE_COMPLETENESS_FIELDS) {
        const value = (p as Record<string, unknown>)[field as string];
        if (value !== null && value !== undefined && value !== '') filled += 1;
      }
    }
    const completeness = Math.round((filled / PROFILE_COMPLETENESS_FIELDS.length) * 100);
    return {
      employeeNo: e.employeeNo,
      employeeName: fullName(e.profile),
      department: e.department?.name ?? '',
      profileCompleteness: completeness,
      documents: e._count.documents,
      skills: e._count.skills,
      trainings: e._count.trainings,
      education: e._count.education,
      workExperience: e._count.workExperience,
    };
  });

  const avgCompleteness =
    mapped.length === 0
      ? 0
      : Math.round(mapped.reduce((s, r) => s + r.profileCompleteness, 0) / mapped.length);

  return {
    total,
    dataset: {
      columns,
      rows: mapped,
      summary: {
        totalEmployees: total,
        avgProfileCompleteness: avgCompleteness,
        totalDocuments: mapped.reduce((s, r) => s + r.documents, 0),
        totalSkills: mapped.reduce((s, r) => s + r.skills, 0),
        totalTrainings: mapped.reduce((s, r) => s + r.trainings, 0),
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Dispatch + public API
// ─────────────────────────────────────────────────────────────

type ReportRunner = (ctx: ListContext) => Promise<{ total: number; dataset: ReportDataset }>;

const RUNNERS: Record<ReportType, ReportRunner> = {
  attendance: attendanceReport,
  dtr: dtrReport,
  late: lateReport,
  undertime: undertimeReport,
  absences: absencesReport,
  leave: leaveReport,
  appointments: appointmentsReport,
  payroll: payrollReport,
  employees: employeesReport,
  'employee-background': employeeBackgroundReport,
};

const REPORT_TITLES: Record<ReportType, string> = {
  attendance: 'Attendance Report',
  dtr: 'Daily Time Record',
  late: 'Late Report',
  undertime: 'Undertime Report',
  absences: 'Absences Report',
  leave: 'Leave Report',
  appointments: 'Appointments Report',
  payroll: 'Payroll Report',
  employees: 'Employee Masterlist',
  'employee-background': 'Employee Background Report',
};

/** Reports whose payload may include sensitive (gov/payroll) data — audit access. */
const SENSITIVE_REPORTS: ReportType[] = ['payroll', 'employees'];

interface RunArgs {
  user: AuthUser;
  type: ReportType;
  filters: ReportFilters;
  params: PaginationParams;
  buildMeta: (total: number, params: PaginationParams) => PaginationMeta;
  audit: Omit<AuditEntry, 'action' | 'module'>;
}

async function runReport(args: RunArgs): Promise<{ total: number; dataset: ReportDataset }> {
  const runner = RUNNERS[args.type];
  if (!runner) throw badRequest('Unknown report type', 'UNKNOWN_REPORT_TYPE');

  const ctx: ListContext = {
    user: args.user,
    filters: args.filters,
    params: args.params,
    audit: args.audit,
  };
  const result = await runner(ctx);

  if (SENSITIVE_REPORTS.includes(args.type)) {
    await writeAudit({
      ...args.audit,
      action: 'REPORT_VIEW',
      module: MODULES.REPORT,
      description: `Viewed sensitive report: ${args.type}`,
      employeeId: args.filters.employeeId ?? null,
    });
  }

  return result;
}

/** JSON list endpoint: returns paginated rows + summary + meta for one report. */
export async function getReport(args: RunArgs) {
  const { total, dataset } = await runReport(args);
  return {
    columns: dataset.columns,
    rows: dataset.rows,
    summary: dataset.summary,
    meta: args.buildMeta(total, args.params),
  };
}

// ─────────────────────────────────────────────────────────────
// Export (CSV / PDF)
// ─────────────────────────────────────────────────────────────

export interface ExportFile {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Escape per RFC 4180 when the cell contains comma, quote, or newline.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(dataset: ReportDataset): Buffer {
  const header = dataset.columns.map((c) => csvCell(c.label)).join(',');
  const lines = dataset.rows.map((row) =>
    dataset.columns.map((c) => csvCell(row[c.key])).join(','),
  );
  // Prepend a UTF-8 BOM so Excel renders unicode correctly.
  const content = ['﻿' + header, ...lines].join('\r\n');
  return Buffer.from(content, 'utf-8');
}

function buildPdf(title: string, dataset: ReportDataset): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageLeft = doc.page.margins.left;
    const pageRight = doc.page.width - doc.page.margins.right;
    const usableWidth = pageRight - pageLeft;

    doc.fontSize(16).fillColor('#111').text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#666').text(`Generated: ${new Date().toISOString()}`, {
      align: 'center',
    });
    doc.moveDown(0.8);

    const columns = dataset.columns;
    const colWidth = columns.length > 0 ? usableWidth / columns.length : usableWidth;

    const drawRow = (cells: string[], opts: { bold?: boolean; fill?: string }) => {
      const y = doc.y;
      const rowHeight = 16;
      if (opts.fill) {
        doc.rect(pageLeft, y - 2, usableWidth, rowHeight).fill(opts.fill);
      }
      doc.fillColor('#000').font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
      cells.forEach((cell, i) => {
        doc.text(cell, pageLeft + i * colWidth + 2, y, {
          width: colWidth - 4,
          height: rowHeight,
          ellipsis: true,
          lineBreak: false,
        });
      });
      doc.y = y + rowHeight;
    };

    const ensureSpace = () => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
      }
    };

    drawRow(columns.map((c) => c.label), { bold: true, fill: '#e5e7eb' });
    dataset.rows.forEach((row) => {
      ensureSpace();
      drawRow(
        columns.map((c) => {
          const v = row[c.key];
          return v === null || v === undefined ? '' : String(v);
        }),
        {},
      );
    });

    doc.moveDown(1);
    ensureSpace();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111').text('Summary', pageLeft);
    doc.font('Helvetica').fontSize(8).fillColor('#333');
    Object.entries(dataset.summary).forEach(([k, v]) => {
      ensureSpace();
      doc.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, pageLeft);
    });

    doc.end();
  });
}

interface ExportArgs {
  user: AuthUser;
  type: ReportType;
  format: 'csv' | 'pdf';
  filters: ReportFilters;
  params: PaginationParams;
  audit: Omit<AuditEntry, 'action' | 'module'>;
}

/**
 * Generic exporter: runs the matching dataset (unpaginated up to MAX_LIMIT via
 * the caller-provided params) and streams it as CSV or PDF.
 */
export async function exportReport(args: ExportArgs): Promise<ExportFile> {
  const { dataset } = await runReport({
    user: args.user,
    type: args.type,
    filters: args.filters,
    params: args.params,
    buildMeta: () => ({ page: 1, limit: 0, total: 0, totalPages: 1, hasNext: false, hasPrev: false }),
    audit: args.audit,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${args.type}-report-${stamp}`;

  await writeAudit({
    ...args.audit,
    action: 'REPORT_EXPORT',
    module: MODULES.REPORT,
    description: `Exported report ${args.type} as ${args.format}`,
    employeeId: args.filters.employeeId ?? null,
  });

  if (args.format === 'pdf') {
    const buffer = await buildPdf(REPORT_TITLES[args.type], dataset);
    return { filename: `${base}.pdf`, contentType: 'application/pdf', buffer };
  }
  const buffer = buildCsv(dataset);
  return { filename: `${base}.csv`, contentType: 'text/csv; charset=utf-8', buffer };
}
