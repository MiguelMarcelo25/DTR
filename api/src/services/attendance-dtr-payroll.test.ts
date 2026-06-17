import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../types';
import * as attendanceService from './attendance.service';
import { processPayroll } from './payroll.service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, unknown>,
}));

vi.mock('../config/prisma', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

vi.mock('../utils/audit', () => ({
  audit: vi.fn(),
  auditContext: vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' })),
  writeAudit: vi.fn(),
}));

vi.mock('../utils/notify', () => ({
  notify: vi.fn(),
  userIdForEmployee: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  uploadBuffer: vi.fn(),
}));

vi.mock('../utils/pdf', () => ({
  generatePayslipPdf: vi.fn(),
}));

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: Date;
  timeIn: Date | null;
  timeOut: Date | null;
  breakIn: Date | null;
  breakOut: Date | null;
  lateMinutes: number;
  undertimeMinutes: number;
  workedMinutes: number;
  status: string;
  remarks?: string | null;
  workSummary?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttendanceEventRecord = {
  id: string;
  employeeId: string;
  attendanceId: string | null;
  correctionId: string | null;
  eventType: string;
  source: string;
  occurredAt: Date;
  businessDate: Date;
  idempotencyKey: string | null;
  actorUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  rawPayload: unknown;
  createdAt: Date;
};

type DtrPeriodRecord = {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  status: string;
  lockReason?: string | null;
};

type TestStore = {
  employees: Array<Record<string, any>>;
  attendances: AttendanceRecord[];
  attendanceEvents: AttendanceEventRecord[];
  corrections: Array<Record<string, any>>;
  overtimeRequests: Array<Record<string, any>>;
  leaveRequests: Array<Record<string, any>>;
  holidays: Array<Record<string, any>>;
  dtrPeriods: DtrPeriodRecord[];
  payrollPeriods: Array<Record<string, any>>;
  payrolls: Array<Record<string, any>>;
  nextAttendanceId: number;
  nextAttendanceEventId: number;
  nextPayrollPeriodId: number;
  nextPayrollId: number;
};

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function sameDay(a: Date, b: Date) {
  return startOfUtcDay(a).getTime() === startOfUtcDay(b).getTime();
}

function inRange(date: Date, start: Date, end: Date) {
  return startOfUtcDay(date).getTime() >= startOfUtcDay(start).getTime()
    && startOfUtcDay(date).getTime() <= startOfUtcDay(end).getTime();
}

function mockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'employee@example.com',
    roles: ['EMPLOYEE'],
    employeeId: 'employee-1',
    ...overrides,
  };
}

function mockReq(headers: Record<string, string> = {}, body: Record<string, unknown> = {}): Request {
  return {
    body,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

function makeStore(overrides: Partial<TestStore> = {}): TestStore {
  return {
    employees: [
      {
        id: 'employee-1',
        employeeNo: 'EMP-001',
        userId: 'user-1',
        employmentStatus: 'ACTIVE',
        deletedAt: null,
        scheduleId: 'schedule-1',
        schedule: {
          timeIn: '08:00',
          timeOut: '17:00',
          breakMinutes: 60,
          gracePeriodMinutes: 0,
          workDays: [1, 2, 3, 4, 5],
        },
        profile: {
          salaryType: 'MONTHLY',
          basicSalary: new Prisma.Decimal(22000),
          allowances: new Prisma.Decimal(0),
          firstName: 'Ada',
          middleName: null,
          lastName: 'Lovelace',
        },
      },
    ],
    attendances: [],
    attendanceEvents: [],
    corrections: [],
    overtimeRequests: [],
    leaveRequests: [],
    holidays: [],
    dtrPeriods: [],
    payrollPeriods: [],
    payrolls: [],
    nextAttendanceId: 1,
    nextAttendanceEventId: 1,
    nextPayrollPeriodId: 1,
    nextPayrollId: 1,
    ...overrides,
  };
}

function matchesEmployeeDate(record: { employeeId: string; date: Date }, where: Record<string, any>) {
  const key = where.employeeId_date;
  return key && record.employeeId === key.employeeId && sameDay(record.date, key.date);
}

function installPrismaMock(store: TestStore) {
  for (const key of Object.keys(prismaMock)) delete prismaMock[key];

  Object.assign(prismaMock, {
    employee: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return store.employees.find((employee) => employee.id === where.id) ?? null;
      }),
      findMany: vi.fn(async () => store.employees.filter((employee) => employee.employmentStatus === 'ACTIVE')),
    },
    attendance: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        if (where.id) return store.attendances.find((attendance) => attendance.id === where.id) ?? null;
        return store.attendances.find((attendance) => matchesEmployeeDate(attendance, where)) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.attendances.filter((attendance) => {
          if (where.employeeId && attendance.employeeId !== where.employeeId) return false;
          const range = where.date as { gte?: Date; lte?: Date } | undefined;
          if (range?.gte && range?.lte && !inRange(attendance.date, range.gte, range.lte)) return false;
          return true;
        });
      }),
      count: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.attendances.filter((attendance) => {
          if (where.employeeId && attendance.employeeId !== where.employeeId) return false;
          if (where.timeIn?.not === null && attendance.timeIn === null) return false;
          if (where.timeOut === null && attendance.timeOut !== null) return false;
          const range = where.date as { gte?: Date; lte?: Date } | undefined;
          if (range?.gte && range?.lte && !inRange(attendance.date, range.gte, range.lte)) return false;
          return true;
        }).length;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }) => {
        const existing = store.attendances.find((attendance) => matchesEmployeeDate(attendance, where));
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const record: AttendanceRecord = {
          id: `attendance-${store.nextAttendanceId++}`,
          employeeId: create.employeeId as string,
          date: create.date as Date,
          timeIn: null,
          timeOut: null,
          breakIn: null,
          breakOut: null,
          lateMinutes: 0,
          undertimeMinutes: 0,
          workedMinutes: 0,
          status: 'PRESENT',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        store.attendances.push(record);
        return record;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
        const record = store.attendances.find((attendance) => attendance.id === where.id);
        if (!record) throw new Error('attendance not found');
        Object.assign(record, data, { updatedAt: new Date() });
        return record;
      }),
    },
    attendanceEvent: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        if (where.idempotencyKey) {
          return store.attendanceEvents.find((event) => event.idempotencyKey === where.idempotencyKey) ?? null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const record: AttendanceEventRecord = {
          id: `attendance-event-${store.nextAttendanceEventId++}`,
          employeeId: data.employeeId,
          attendanceId: data.attendanceId ?? null,
          correctionId: data.correctionId ?? null,
          eventType: data.eventType,
          source: data.source,
          occurredAt: data.occurredAt,
          businessDate: data.businessDate,
          idempotencyKey: data.idempotencyKey ?? null,
          actorUserId: data.actorUserId ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          rawPayload: data.rawPayload ?? null,
          createdAt: new Date(),
        };
        store.attendanceEvents.push(record);
        return record;
      }),
    },
    attendanceCorrection: {
      count: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.corrections.filter((correction) => {
          if (where.employeeId && correction.employeeId !== where.employeeId) return false;
          if (where.status && correction.status !== where.status) return false;
          const range = where.date as { gte?: Date; lte?: Date } | undefined;
          if (range?.gte && range?.lte && !inRange(correction.date, range.gte, range.lte)) return false;
          return true;
        }).length;
      }),
    },
    overtimeRequest: {
      count: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.overtimeRequests.filter((request) => {
          if (where.employeeId && request.employeeId !== where.employeeId) return false;
          if (where.status && request.status !== where.status) return false;
          const range = where.date as { gte?: Date; lte?: Date } | undefined;
          if (range?.gte && range?.lte && !inRange(request.date, range.gte, range.lte)) return false;
          return true;
        }).length;
      }),
      aggregate: vi.fn(async () => ({ _sum: { hours: new Prisma.Decimal(0) } })),
    },
    leaveRequest: {
      count: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.leaveRequests.filter((request) => {
          if (where.employeeId && request.employeeId !== where.employeeId) return false;
          if (where.status && request.status !== where.status) return false;
          return true;
        }).length;
      }),
      findMany: vi.fn(async () => store.leaveRequests.filter((request) => request.status === 'APPROVED')),
    },
    holiday: {
      findMany: vi.fn(async () => store.holidays),
    },
    dtrPeriod: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        if (where.id) return store.dtrPeriods.find((period) => period.id === where.id) ?? null;
        const key = where.employeeId_year_month;
        return store.dtrPeriods.find((period) =>
          period.employeeId === key.employeeId && period.year === key.year && period.month === key.month,
        ) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        return store.dtrPeriods.filter((period) => {
          if (where.employeeId?.in && !where.employeeId.in.includes(period.employeeId)) return false;
          if (where.year && period.year !== where.year) return false;
          if (where.month && period.month !== where.month) return false;
          return true;
        });
      }),
    },
    payrollPeriod: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const period = { id: `payroll-period-${store.nextPayrollPeriodId++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.payrollPeriods.push(period);
        return period;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
        const period = store.payrollPeriods.find((item) => item.id === where.id);
        if (!period) throw new Error('payroll period not found');
        Object.assign(period, data);
        return period;
      }),
    },
    payroll: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const payroll = { id: `payroll-${store.nextPayrollId++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.payrolls.push(payroll);
        return payroll;
      }),
    },
    employeeActivityTimeline: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => data),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: unknown) => Promise<unknown>)(prismaMock);
      return Promise.all(arg as Promise<unknown>[]);
    }),
  });
}

describe('attendance event journal and DTR readiness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T08:05:00.000Z'));
  });

  it('creates one TIME_IN event per idempotency key and returns the same projection on retry', async () => {
    const store = makeStore();
    installPrismaMock(store);
    const user = mockUser();
    const req = mockReq({ 'idempotency-key': 'time-in-2026-06-17' });

    const first = await attendanceService.timeIn(req, user);
    const second = await attendanceService.timeIn(req, user);

    expect(second.id).toBe(first.id);
    expect(store.attendanceEvents).toHaveLength(1);
    expect(store.attendanceEvents[0]).toMatchObject({
      employeeId: 'employee-1',
      attendanceId: first.id,
      eventType: 'TIME_IN',
      source: 'WEB',
      idempotencyKey: 'time-in-2026-06-17',
      actorUserId: 'user-1',
    });
  });

  it('reports missing time-outs and pending corrections as DTR readiness blockers', async () => {
    const store = makeStore({
      attendances: [
        {
          id: 'attendance-1',
          employeeId: 'employee-1',
          date: new Date('2026-06-03T00:00:00.000Z'),
          timeIn: new Date('2026-06-03T08:00:00.000Z'),
          timeOut: null,
          breakIn: null,
          breakOut: null,
          lateMinutes: 0,
          undertimeMinutes: 0,
          workedMinutes: 0,
          status: 'PRESENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      corrections: [
        {
          id: 'correction-1',
          employeeId: 'employee-1',
          date: new Date('2026-06-03T00:00:00.000Z'),
          status: 'PENDING',
        },
      ],
    });
    installPrismaMock(store);

    const readiness = await (attendanceService as any).getDtrReadiness(mockUser(), {
      year: 2026,
      month: 6,
    });

    expect(readiness).toMatchObject({
      employeeId: 'employee-1',
      year: 2026,
      month: 6,
      status: 'OPEN',
      ready: false,
      blockingIssues: {
        missingTimeOuts: 1,
        pendingCorrections: 1,
        pendingOvertime: 0,
        pendingLeave: 0,
        missingSchedule: false,
      },
    });
  });

  it('rejects punches when the DTR period is locked', async () => {
    const store = makeStore({
      dtrPeriods: [
        {
          id: 'dtr-period-locked',
          employeeId: 'employee-1',
          year: 2026,
          month: 6,
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-30T00:00:00.000Z'),
          status: 'LOCKED',
        },
      ],
    });
    installPrismaMock(store);

    await expect(
      attendanceService.timeIn(mockReq({ 'idempotency-key': 'locked-period-time-in' }), mockUser()),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'DTR_PERIOD_LOCKED',
    });
    expect(store.attendances).toHaveLength(0);
    expect(store.attendanceEvents).toHaveLength(0);
  });

  it('rejects DTR submission when readiness blockers remain', async () => {
    const store = makeStore({
      attendances: [
        {
          id: 'attendance-1',
          employeeId: 'employee-1',
          date: new Date('2026-06-03T00:00:00.000Z'),
          timeIn: new Date('2026-06-03T08:00:00.000Z'),
          timeOut: null,
          breakIn: null,
          breakOut: null,
          lateMinutes: 0,
          undertimeMinutes: 0,
          workedMinutes: 0,
          status: 'PRESENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    installPrismaMock(store);

    await expect(
      attendanceService.submitDtrPeriod(mockReq(), mockUser(), { year: 2026, month: 6 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'DTR_NOT_READY',
    });
  });

  it('rejects locking a DTR period before HR approval completes', async () => {
    const store = makeStore({
      dtrPeriods: [
        {
          id: 'dtr-period-submitted',
          employeeId: 'employee-1',
          year: 2026,
          month: 6,
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-30T00:00:00.000Z'),
          status: 'PENDING_HR',
        },
      ],
    });
    installPrismaMock(store);

    await expect(
      attendanceService.lockDtrPeriod(
        mockReq(),
        mockUser({ id: 'hr-user', roles: ['HR'], employeeId: null }),
        'dtr-period-submitted',
        {},
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'DTR_NOT_APPROVED',
    });
  });
});

describe('payroll DTR handoff guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
  });

  it('rejects payroll processing when an employee DTR period is not locked or payroll-ready', async () => {
    const store = makeStore({
      attendances: [
        {
          id: 'attendance-1',
          employeeId: 'employee-1',
          date: new Date('2026-06-03T00:00:00.000Z'),
          timeIn: new Date('2026-06-03T08:00:00.000Z'),
          timeOut: new Date('2026-06-03T17:00:00.000Z'),
          breakIn: null,
          breakOut: null,
          lateMinutes: 0,
          undertimeMinutes: 0,
          workedMinutes: 480,
          status: 'PRESENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      dtrPeriods: [
        {
          id: 'dtr-period-1',
          employeeId: 'employee-1',
          year: 2026,
          month: 6,
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-30T00:00:00.000Z'),
          status: 'SUBMITTED',
        },
      ],
    });
    installPrismaMock(store);

    await expect(
      processPayroll(
        mockReq(),
        mockUser({ id: 'admin-user', email: 'admin@example.com', roles: ['ADMIN'], employeeId: null }),
        {
          name: 'June 2026 Payroll',
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-30T00:00:00.000Z'),
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'DTR_NOT_READY',
    });
  });
});
