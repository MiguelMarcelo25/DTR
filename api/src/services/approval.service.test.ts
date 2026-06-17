import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import type { AuthUser } from '../types';
import { audit } from '../utils/audit';
import {
  actOnApproval,
  createApprovalInstance,
  getApproval,
  getInbox,
  type ApprovalTransactionalDb,
} from './approval.service';

vi.mock('../utils/audit', () => ({
  audit: vi.fn(),
}));

vi.mock('../config/prisma', () => ({
  default: {},
  prisma: {},
}));

type EmployeeRecord = {
  id: string;
  employeeNo: string;
  departmentId: string | null;
  branchId: string | null;
  supervisorId: string | null;
  userId?: string | null;
  profile?: { firstName: string; lastName: string } | null;
};

type ApprovalStepRecord = {
  id: string;
  instanceId: string;
  sequence: number;
  stage: string;
  assignedRole: string;
  assignedEmployeeId: string | null;
  status: string;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  decision: string | null;
  note: string | null;
  oldValues: unknown | null;
  newValues: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

type ApprovalInstanceRecord = {
  id: string;
  subjectType: string;
  subjectId: string;
  requesterEmployeeId: string;
  departmentId: string | null;
  branchId: string | null;
  currentStage: string;
  status: string;
  submittedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  metadata: unknown;
  steps: ApprovalStepRecord[];
};

type UserOrgScopeRecord = {
  userId: string;
  roleName: string;
  departmentId: string | null;
  branchId: string | null;
  isGlobal: boolean;
};

interface ApprovalStore {
  employees: EmployeeRecord[];
  instances: ApprovalInstanceRecord[];
  scopes: UserOrgScopeRecord[];
  nextInstanceId: number;
  nextStepId: number;
}

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    roles: ['EMPLOYEE'],
    employeeId: 'employee-1',
    ...overrides,
  };
}

function requestFor(actor: AuthUser): Request {
  return {
    user: actor,
    headers: {},
    socket: {},
  } as Request;
}

function cloneInstance(store: ApprovalStore, instance: ApprovalInstanceRecord) {
  const requester = store.employees.find((employee) => employee.id === instance.requesterEmployeeId);
  return {
    ...instance,
    requester: requester
      ? {
          id: requester.id,
          employeeNo: requester.employeeNo,
          departmentId: requester.departmentId,
          branchId: requester.branchId,
          profile: requester.profile ?? null,
        }
      : null,
    steps: [...instance.steps].sort((a, b) => a.sequence - b.sequence),
  };
}

function matchesInboxWhere(instance: ApprovalInstanceRecord, where: Record<string, unknown>): boolean {
  const id = where.id;
  if (typeof id === 'string' && instance.id !== id) return false;

  const subjectType = where.subjectType;
  if (subjectType && instance.subjectType !== subjectType) return false;

  const status = where.status;
  if (status && instance.status !== status) return false;

  const currentStage = where.currentStage;
  if (currentStage && instance.currentStage !== currentStage) return false;

  const requesterEmployeeId = where.requesterEmployeeId;
  if (
    requesterEmployeeId &&
    typeof requesterEmployeeId === 'object' &&
    'not' in requesterEmployeeId &&
    instance.requesterEmployeeId === requesterEmployeeId.not
  ) {
    return false;
  }

  const steps = where.steps as { some?: Partial<ApprovalStepRecord> } | undefined;
  if (steps?.some) {
    const expected = steps.some;
    const hasStep = instance.steps.some((step) =>
      Object.entries(expected).every(([key, value]) => step[key as keyof ApprovalStepRecord] === value),
    );
    if (!hasStep) return false;
  }

  const or = where.OR as Record<string, unknown>[] | undefined;
  if (or?.length) return or.some((entry) => matchesInboxWhere(instance, entry));

  const and = where.AND as Record<string, unknown>[] | undefined;
  if (and?.length) return and.every((entry) => matchesInboxWhere(instance, entry));

  if ('departmentId' in where && instance.departmentId !== where.departmentId) return false;
  if ('branchId' in where && instance.branchId !== where.branchId) return false;

  return true;
}

function makePrismaMock(overrides: Partial<ApprovalStore> = {}) {
  const now = new Date('2026-06-17T00:00:00.000Z');
  const store: ApprovalStore = {
    employees: [],
    instances: [],
    scopes: [],
    nextInstanceId: 1,
    nextStepId: 1,
    ...overrides,
  };

  const prisma = {
    employee: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return store.employees.find((employee) => employee.id === where.id) ?? null;
      }),
    },
    approvalInstance: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `instance-${store.nextInstanceId++}`;
        const stepCreates = (data.steps as { create: Array<Record<string, unknown>> }).create;
        const instance: ApprovalInstanceRecord = {
          id,
          subjectType: data.subjectType as string,
          subjectId: data.subjectId as string,
          requesterEmployeeId: data.requesterEmployeeId as string,
          departmentId: (data.departmentId as string | null | undefined) ?? null,
          branchId: (data.branchId as string | null | undefined) ?? null,
          currentStage: data.currentStage as string,
          status: data.status as string,
          submittedAt: now,
          completedAt: null,
          cancelledAt: null,
          metadata: data.metadata ?? {},
          steps: [],
        };
        instance.steps = stepCreates.map((step) => ({
          id: `step-${store.nextStepId++}`,
          instanceId: id,
          sequence: step.sequence as number,
          stage: step.stage as string,
          assignedRole: step.assignedRole as string,
          assignedEmployeeId: (step.assignedEmployeeId as string | null | undefined) ?? null,
          status: step.status as string,
          decidedByUserId: null,
          decidedAt: null,
          decision: null,
          note: null,
          oldValues: null,
          newValues: null,
          createdAt: now,
          updatedAt: now,
        }));
        store.instances.push(instance);
        return cloneInstance(store, instance);
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const instance = store.instances.find((item) => item.id === where.id);
        return instance ? cloneInstance(store, instance) : null;
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return store.instances.filter((instance) => matchesInboxWhere(instance, where)).map((instance) => cloneInstance(store, instance));
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return store.instances.filter((instance) => matchesInboxWhere(instance, where)).length;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ApprovalInstanceRecord> }) => {
        const instance = store.instances.find((item) => item.id === where.id);
        if (!instance) throw new Error('instance not found');
        Object.assign(instance, data);
        return cloneInstance(store, instance);
      }),
    },
    approvalStep: {
      create: vi.fn(async ({ data }: { data: Partial<ApprovalStepRecord> }) => {
        const instance = store.instances.find((item) => item.id === data.instanceId);
        if (!instance) throw new Error('instance not found');
        const step: ApprovalStepRecord = {
          id: `step-${store.nextStepId++}`,
          instanceId: data.instanceId!,
          sequence: data.sequence!,
          stage: data.stage!,
          assignedRole: data.assignedRole!,
          assignedEmployeeId: data.assignedEmployeeId ?? null,
          status: data.status!,
          decidedByUserId: null,
          decidedAt: null,
          decision: null,
          note: null,
          oldValues: null,
          newValues: null,
          createdAt: now,
          updatedAt: now,
        };
        instance.steps.push(step);
        return step;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ApprovalStepRecord> }) => {
        const step = store.instances.flatMap((instance) => instance.steps).find((item) => item.id === where.id);
        if (!step) throw new Error('step not found');
        Object.assign(step, data);
        return step;
      }),
      updateMany: vi.fn(
        async ({ where, data }: { where: { id: string; status?: string }; data: Partial<ApprovalStepRecord> }) => {
          const step = store.instances.flatMap((instance) => instance.steps).find((item) => item.id === where.id);
          if (!step || (where.status && step.status !== where.status)) return { count: 0 };
          Object.assign(step, data);
          return { count: 1 };
        },
      ),
    },
    userOrgScope: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; roleName?: { in: string[] } } }) => {
        return store.scopes.filter((scope) => {
          if (scope.userId !== where.userId) return false;
          if (where.roleName?.in && !where.roleName.in.includes(scope.roleName)) return false;
          return true;
        });
      }),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
  };

  return { prisma: prisma as unknown as ApprovalTransactionalDb, store };
}

function pendingSupervisorInstance(): ApprovalInstanceRecord {
  return {
    id: 'approval-1',
    subjectType: 'LEAVE_REQUEST',
    subjectId: 'leave-1',
    requesterEmployeeId: 'employee-1',
    departmentId: 'department-1',
    branchId: 'branch-1',
    currentStage: 'SUPERVISOR',
    status: 'PENDING_SUPERVISOR',
    submittedAt: new Date('2026-06-17T00:00:00.000Z'),
    completedAt: null,
    cancelledAt: null,
    metadata: {},
    steps: [
      {
        id: 'step-1',
        instanceId: 'approval-1',
        sequence: 1,
        stage: 'SUPERVISOR',
        assignedRole: 'SUPERVISOR',
        assignedEmployeeId: 'supervisor-1',
        status: 'PENDING',
        decidedByUserId: null,
        decidedAt: null,
        decision: null,
        note: null,
        oldValues: null,
        newValues: null,
        createdAt: new Date('2026-06-17T00:00:00.000Z'),
        updatedAt: new Date('2026-06-17T00:00:00.000Z'),
      },
    ],
  };
}

function pendingHrInstance(overrides: Partial<ApprovalInstanceRecord> = {}): ApprovalInstanceRecord {
  return {
    id: 'approval-hr-1',
    subjectType: 'OVERTIME_REQUEST',
    subjectId: 'overtime-1',
    requesterEmployeeId: 'employee-1',
    departmentId: 'department-1',
    branchId: 'branch-1',
    currentStage: 'HR',
    status: 'PENDING_HR',
    submittedAt: new Date('2026-06-17T00:00:00.000Z'),
    completedAt: null,
    cancelledAt: null,
    metadata: {},
    steps: [
      {
        id: 'step-hr-1',
        instanceId: 'approval-hr-1',
        sequence: 1,
        stage: 'HR',
        assignedRole: 'HR',
        assignedEmployeeId: null,
        status: 'PENDING',
        decidedByUserId: null,
        decidedAt: null,
        decision: null,
        note: null,
        oldValues: null,
        newValues: null,
        createdAt: new Date('2026-06-17T00:00:00.000Z'),
        updatedAt: new Date('2026-06-17T00:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

describe('approval service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an instance with a pending supervisor step when requester has a supervisor', async () => {
    const { prisma } = makePrismaMock({
      employees: [
        {
          id: 'employee-1',
          employeeNo: 'EMP-001',
          departmentId: 'department-1',
          branchId: 'branch-1',
          supervisorId: 'supervisor-1',
        },
      ],
    });

    const result = await createApprovalInstance(
      prisma,
      'LEAVE_REQUEST',
      'leave-1',
      'employee-1',
      { reason: 'Vacation' },
    );

    expect(result.status).toBe('PENDING_SUPERVISOR');
    expect(result.currentStage).toBe('SUPERVISOR');
    expect(result.departmentId).toBe('department-1');
    expect(result.branchId).toBe('branch-1');
    expect(result.steps).toMatchObject([
      {
        sequence: 1,
        stage: 'SUPERVISOR',
        assignedRole: 'SUPERVISOR',
        assignedEmployeeId: 'supervisor-1',
        status: 'PENDING',
      },
    ]);
  });

  it('skips supervisor and opens an HR step when requester has no supervisor', async () => {
    const { prisma } = makePrismaMock({
      employees: [
        {
          id: 'employee-1',
          employeeNo: 'EMP-001',
          departmentId: 'department-1',
          branchId: 'branch-1',
          supervisorId: null,
        },
      ],
    });

    const result = await createApprovalInstance(
      prisma,
      'ATTENDANCE_CORRECTION',
      'correction-1',
      'employee-1',
    );

    expect(result.status).toBe('PENDING_HR');
    expect(result.currentStage).toBe('HR');
    expect(result.steps).toMatchObject([
      {
        sequence: 1,
        stage: 'SUPERVISOR',
        assignedRole: 'SUPERVISOR',
        assignedEmployeeId: null,
        status: 'SKIPPED',
      },
      {
        sequence: 2,
        stage: 'HR',
        assignedRole: 'HR',
        assignedEmployeeId: null,
        status: 'PENDING',
      },
    ]);
  });

  it('returns approvals actionable by the supervisor', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingSupervisorInstance()],
    });

    const result = await getInbox(
      prisma,
      user({ id: 'supervisor-user', employeeId: 'supervisor-1' }),
      {},
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('approval-1');
  });

  it('scopes HR inbox items when user org scopes exist', async () => {
    const { prisma } = makePrismaMock({
      instances: [
        pendingHrInstance({ id: 'approval-matching', departmentId: 'department-1' }),
        pendingHrInstance({ id: 'approval-outside', departmentId: 'department-2' }),
      ],
      scopes: [
        {
          userId: 'hr-user',
          roleName: 'HR',
          departmentId: 'department-1',
          branchId: null,
          isGlobal: false,
        },
      ],
    });

    const result = await getInbox(prisma, user({ id: 'hr-user', roles: ['HR'], employeeId: null }), {});

    expect(result.items.map((item) => item.id)).toEqual(['approval-matching']);
  });

  it('does not include the requester in the HR inbox for their own approval', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingHrInstance()],
    });

    const result = await getInbox(
      prisma,
      user({ id: 'requester-user', roles: ['HR'], employeeId: 'employee-1' }),
      {},
    );

    expect(result.items).toEqual([]);
  });

  it('allows a requester to read their own approval', async () => {
    const { prisma } = makePrismaMock({
      employees: [
        {
          id: 'employee-1',
          employeeNo: 'EMP-001',
          departmentId: 'department-1',
          branchId: 'branch-1',
          supervisorId: null,
          profile: { firstName: 'Ada', lastName: 'Lovelace' },
        },
      ],
      instances: [pendingHrInstance()],
    });

    const result = await getApproval(prisma, 'approval-hr-1', user({ employeeId: 'employee-1' }));

    expect(result.requester?.employeeNo).toBe('EMP-001');
    expect(result.steps).toHaveLength(1);
  });

  it('advances to HR when the supervisor approves', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingSupervisorInstance()],
    });
    const supervisor = user({ id: 'supervisor-user', employeeId: 'supervisor-1' });

    const result = await actOnApproval(requestFor(supervisor), prisma, supervisor, 'approval-1', {
      decision: 'APPROVE',
    });

    expect(result.status).toBe('PENDING_HR');
    expect(result.currentStage).toBe('HR');
    expect(result.steps).toMatchObject([
      { sequence: 1, stage: 'SUPERVISOR', status: 'APPROVED', decision: 'APPROVE' },
      { sequence: 2, stage: 'HR', status: 'PENDING' },
    ]);
    expect(audit).toHaveBeenCalled();
  });

  it('finalizes as approved when HR approves', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingHrInstance()],
    });
    const hr = user({ id: 'hr-user', roles: ['HR'], employeeId: 'hr-employee' });

    const result = await actOnApproval(requestFor(hr), prisma, hr, 'approval-hr-1', {
      decision: 'APPROVE',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.steps[0]).toMatchObject({
      status: 'APPROVED',
      decidedByUserId: 'hr-user',
      decision: 'APPROVE',
    });
  });

  it('marks a DTR period as HR-approved when HR approves its approval', async () => {
    const { prisma } = makePrismaMock({
      instances: [
        pendingHrInstance({
          subjectType: 'DTR_PERIOD',
          subjectId: 'dtr-period-1',
        }),
      ],
    });
    const dtrUpdate = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
    }));
    (prisma as any).dtrPeriod = { update: dtrUpdate };
    const hr = user({ id: 'hr-user', roles: ['HR'], employeeId: 'hr-employee' });

    const result = await actOnApproval(requestFor(hr), prisma, hr, 'approval-hr-1', {
      decision: 'APPROVE',
    });

    expect(result.status).toBe('APPROVED');
    expect(dtrUpdate).toHaveBeenCalledWith({
      where: { id: 'dtr-period-1' },
      data: expect.objectContaining({
        status: 'APPROVED',
        hrApprovedById: 'hr-user',
      }),
    });
  });

  it('applies an attendance correction when HR approves its approval', async () => {
    const correctionDate = new Date('2026-06-16T00:00:00.000Z');
    const requestedTimeIn = new Date('2026-06-16T08:00:00.000Z');
    const requestedTimeOut = new Date('2026-06-16T17:00:00.000Z');
    const { prisma } = makePrismaMock({
      employees: [
        {
          id: 'employee-1',
          employeeNo: 'EMP-001',
          departmentId: 'department-1',
          branchId: 'branch-1',
          supervisorId: null,
        },
      ],
      instances: [
        pendingHrInstance({
          subjectType: 'ATTENDANCE_CORRECTION',
          subjectId: 'correction-1',
        }),
      ],
    });
    const correctionUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'correction-1',
      ...data,
    }));
    const attendanceUpsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
      id: 'attendance-1',
      ...create,
    }));
    (prisma as any).attendanceCorrection = {
      findUnique: vi.fn(async () => ({
        id: 'correction-1',
        employeeId: 'employee-1',
        attendanceId: null,
        date: correctionDate,
        requestedTimeIn,
        requestedTimeOut,
        requestedBreakIn: null,
        requestedBreakOut: null,
        reason: 'Forgot to punch',
        status: 'PENDING',
      })),
      update: correctionUpdate,
    };
    (prisma as any).attendance = {
      findUnique: vi.fn(async () => null),
      upsert: attendanceUpsert,
    };
    (prisma as any).attendanceEvent = { create: vi.fn(async () => ({})) };
    (prisma as any).employeeActivityTimeline = { create: vi.fn(async () => ({})) };
    const hr = user({ id: 'hr-user', roles: ['HR'], employeeId: 'hr-employee' });

    const result = await actOnApproval(requestFor(hr), prisma, hr, 'approval-hr-1', {
      decision: 'APPROVE',
      note: 'OK',
    });

    expect(result.status).toBe('APPROVED');
    expect(attendanceUpsert).toHaveBeenCalled();
    expect(correctionUpdate).toHaveBeenCalledWith({
      where: { id: 'correction-1' },
      data: expect.objectContaining({
        status: 'APPROVED',
        reviewedById: 'hr-user',
        attendanceId: 'attendance-1',
      }),
    });
  });

  it('requires a note before rejecting', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingSupervisorInstance()],
    });
    const supervisor = user({ id: 'supervisor-user', employeeId: 'supervisor-1' });

    await expect(
      actOnApproval(requestFor(supervisor), prisma, supervisor, 'approval-1', {
        decision: 'REJECT',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('finalizes as rejected when a decision includes a rejection note', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingSupervisorInstance()],
    });
    const supervisor = user({ id: 'supervisor-user', employeeId: 'supervisor-1' });

    const result = await actOnApproval(requestFor(supervisor), prisma, supervisor, 'approval-1', {
      decision: 'REJECT',
      note: 'Missing coverage plan',
    });

    expect(result.status).toBe('REJECTED');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.steps[0]).toMatchObject({
      status: 'REJECTED',
      decision: 'REJECT',
      note: 'Missing coverage plan',
    });
  });

  it('blocks self approval even when the requester has an HR role', async () => {
    const { prisma } = makePrismaMock({
      instances: [pendingHrInstance()],
    });
    const requesterHr = user({ id: 'requester-user', roles: ['HR'], employeeId: 'employee-1' });

    await expect(
      actOnApproval(requestFor(requesterHr), prisma, requesterHr, 'approval-hr-1', {
        decision: 'APPROVE',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });
});
