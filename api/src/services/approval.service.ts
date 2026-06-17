import type { Request } from 'express';
import {
  ApprovalSubjectType,
  DtrPeriodStatus,
  type Prisma,
} from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES, ROLES, type RoleName } from '../config/constants';
import type { AuthUser, PaginationMeta } from '../types';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { isPrivileged } from '../utils/access';
import { audit } from '../utils/audit';
import { buildMeta, buildOrderBy, buildPagination } from '../utils/pagination';
import {
  applyAttendanceCorrection,
  rejectAttendanceCorrection,
} from './attendanceCorrectionWorkflow';
import type {
  ApprovalActionInput,
  ApprovalInboxQueryInput,
} from '../validations/approval.validation';

const STAGES = {
  SUPERVISOR: 'SUPERVISOR',
  HR: 'HR',
} as const;

const STEP_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SKIPPED: 'SKIPPED',
} as const;

const INSTANCE_STATUS = {
  PENDING_SUPERVISOR: 'PENDING_SUPERVISOR',
  PENDING_HR: 'PENDING_HR',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

const DECISION = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

const APPROVAL_SORT = ['submittedAt', 'updatedAt', 'status'];
const APPROVAL_PRIVILEGED_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR];

const approvalInclude = {
  requester: {
    select: {
      id: true,
      employeeNo: true,
      departmentId: true,
      branchId: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  steps: { orderBy: { sequence: 'asc' as const } },
};

interface RequesterEmployee {
  id: string;
  departmentId: string | null;
  branchId: string | null;
  supervisorId: string | null;
}

interface UserOrgScopeLike {
  userId: string;
  roleName: string;
  departmentId: string | null;
  branchId: string | null;
  isGlobal: boolean;
}

interface ApprovalStepLike {
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
}

interface ApprovalInstanceLike {
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
  steps: ApprovalStepLike[];
  requester?: {
    id: string;
    employeeNo: string;
    departmentId: string | null;
    branchId: string | null;
    profile: { firstName: string; lastName: string } | null;
  } | null;
}

type ApprovalWhere = Record<string, unknown>;

export interface ApprovalDb {
  employee: {
    findUnique(args: {
      where: { id: string };
      select?: Record<string, unknown>;
    }): Promise<RequesterEmployee | null>;
  };
  approvalInstance: {
    create(args: {
      data: Record<string, unknown>;
      include?: typeof approvalInclude;
    }): Promise<ApprovalInstanceLike>;
    findUnique(args: {
      where: { id: string };
      include?: typeof approvalInclude;
    }): Promise<ApprovalInstanceLike | null>;
    findMany(args: {
      where: ApprovalWhere;
      include?: typeof approvalInclude;
      orderBy?: Record<string, 'asc' | 'desc'>;
      skip?: number;
      take?: number;
    }): Promise<ApprovalInstanceLike[]>;
    count(args: { where: ApprovalWhere }): Promise<number>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include?: typeof approvalInclude;
    }): Promise<ApprovalInstanceLike>;
  };
  approvalStep: {
    create(args: { data: Record<string, unknown> }): Promise<ApprovalStepLike>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ApprovalStepLike>;
    updateMany(args: {
      where: { id: string; status?: string };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  userOrgScope: {
    findMany(args: {
      where: { userId: string; roleName?: { in: RoleName[] } };
    }): Promise<UserOrgScopeLike[]>;
  };
}

export interface ApprovalTransactionalDb extends ApprovalDb {
  $transaction<T>(callback: (tx: ApprovalDb) => Promise<T>): Promise<T>;
}

export interface ApprovalInboxResult {
  items: ApprovalInstanceLike[];
  meta: PaginationMeta;
}

function defaultDb(): ApprovalTransactionalDb {
  return prisma as unknown as ApprovalTransactionalDb;
}

function isApprovalDb(value: unknown): value is ApprovalDb {
  return Boolean(value && typeof value === 'object' && 'approvalInstance' in value);
}

function sortSteps(steps: ApprovalStepLike[]): ApprovalStepLike[] {
  return [...steps].sort((a, b) => a.sequence - b.sequence);
}

function currentPendingStep(instance: ApprovalInstanceLike): ApprovalStepLike | undefined {
  return sortSteps(instance.steps).find(
    (step) => step.status === STEP_STATUS.PENDING && step.stage === instance.currentStage,
  );
}

function maxStepSequence(instance: ApprovalInstanceLike): number {
  return instance.steps.reduce((max, step) => Math.max(max, step.sequence), 0);
}

function privilegedRolesFor(user: AuthUser): RoleName[] {
  return user.roles.filter((role): role is RoleName => APPROVAL_PRIVILEGED_ROLES.includes(role));
}

async function loadUserOrgScopes(db: ApprovalDb, user: AuthUser): Promise<UserOrgScopeLike[]> {
  const roles = privilegedRolesFor(user);
  if (!roles.length) return [];
  return db.userOrgScope.findMany({
    where: { userId: user.id, roleName: { in: roles } },
  });
}

function scopeMatchesInstance(scope: UserOrgScopeLike, instance: ApprovalInstanceLike): boolean {
  if (scope.isGlobal) return true;
  if (!scope.departmentId && !scope.branchId) return false;
  if (scope.departmentId && scope.departmentId !== instance.departmentId) return false;
  if (scope.branchId && scope.branchId !== instance.branchId) return false;
  return true;
}

async function privilegedCanAccess(
  db: ApprovalDb,
  user: AuthUser,
  instance: ApprovalInstanceLike,
): Promise<boolean> {
  if (!isPrivileged(user)) return false;
  const scopes = await loadUserOrgScopes(db, user);
  if (scopes.length === 0) return true;
  return scopes.some((scope) => scopeMatchesInstance(scope, instance));
}

async function assertCanReadApproval(
  db: ApprovalDb,
  user: AuthUser,
  instance: ApprovalInstanceLike,
): Promise<void> {
  if (user.employeeId && user.employeeId === instance.requesterEmployeeId) return;
  if (user.employeeId && instance.steps.some((step) => step.assignedEmployeeId === user.employeeId)) return;
  if (await privilegedCanAccess(db, user, instance)) return;
  throw forbidden('You cannot access this approval');
}

async function assertCanActOnStep(
  db: ApprovalDb,
  user: AuthUser,
  instance: ApprovalInstanceLike,
  step: ApprovalStepLike,
): Promise<void> {
  if (user.employeeId && user.employeeId === instance.requesterEmployeeId) {
    throw forbidden('You cannot approve your own request');
  }

  if (step.stage === STAGES.SUPERVISOR) {
    if (user.employeeId && step.assignedEmployeeId === user.employeeId) return;
    throw forbidden('Only the assigned supervisor can act on this approval');
  }

  if (step.stage === STAGES.HR) {
    if (await privilegedCanAccess(db, user, instance)) return;
    throw forbidden('Only HR/Admin approvers can act on this approval');
  }

  throw badRequest(`Unsupported approval stage: ${step.stage}`);
}

function scopedWhere(scope: UserOrgScopeLike): ApprovalWhere | null {
  if (scope.isGlobal) return null;
  const and: ApprovalWhere[] = [];
  if (scope.departmentId) and.push({ departmentId: scope.departmentId });
  if (scope.branchId) and.push({ branchId: scope.branchId });
  if (!and.length) return { id: '__NO_APPROVAL_SCOPE__' };
  return and.length === 1 ? and[0] : { AND: and };
}

async function inboxWhere(db: ApprovalDb, user: AuthUser, query: ApprovalInboxQueryInput): Promise<ApprovalWhere> {
  const conditions: ApprovalWhere[] = [];

  if (user.employeeId) {
    conditions.push({
      status: INSTANCE_STATUS.PENDING_SUPERVISOR,
      currentStage: STAGES.SUPERVISOR,
      steps: {
        some: {
          stage: STAGES.SUPERVISOR,
          status: STEP_STATUS.PENDING,
          assignedEmployeeId: user.employeeId,
        },
      },
    });
  }

  if (isPrivileged(user)) {
    const hrCondition: ApprovalWhere = {
      status: INSTANCE_STATUS.PENDING_HR,
      currentStage: STAGES.HR,
      steps: {
        some: {
          stage: STAGES.HR,
          status: STEP_STATUS.PENDING,
        },
      },
    };
    const scopes = await loadUserOrgScopes(db, user);
    if (scopes.length === 0 || scopes.some((scope) => scope.isGlobal)) {
      conditions.push(hrCondition);
    } else {
      const scoped = scopes.map(scopedWhere).filter((where): where is ApprovalWhere => Boolean(where));
      if (scoped.length) conditions.push({ AND: [hrCondition, { OR: scoped }] });
    }
  }

  const actionable = conditions.length === 1 ? conditions[0] : { OR: conditions };
  const guarded = conditions.length ? actionable : { id: '__NO_APPROVAL_ACCESS__' };
  const inboxGuards: ApprovalWhere[] = [guarded];
  if (user.employeeId) inboxGuards.push({ requesterEmployeeId: { not: user.employeeId } });
  if (query.subjectType) inboxGuards.push({ subjectType: query.subjectType });
  return inboxGuards.length === 1 ? inboxGuards[0] : { AND: inboxGuards };
}

export async function createApprovalInstance(
  txOrPrisma: ApprovalDb,
  subjectType: ApprovalSubjectType,
  subjectId: string,
  requesterEmployeeId: string,
  metadata?: Prisma.InputJsonValue,
): Promise<ApprovalInstanceLike> {
  const requester = await txOrPrisma.employee.findUnique({
    where: { id: requesterEmployeeId },
    select: { id: true, departmentId: true, branchId: true, supervisorId: true },
  });
  if (!requester) throw notFound('Requester employee not found');

  const hasSupervisor = Boolean(requester.supervisorId);
  const steps = hasSupervisor
    ? [
        {
          sequence: 1,
          stage: STAGES.SUPERVISOR,
          assignedRole: STAGES.SUPERVISOR,
          assignedEmployeeId: requester.supervisorId,
          status: STEP_STATUS.PENDING,
        },
      ]
    : [
        {
          sequence: 1,
          stage: STAGES.SUPERVISOR,
          assignedRole: STAGES.SUPERVISOR,
          assignedEmployeeId: null,
          status: STEP_STATUS.SKIPPED,
        },
        {
          sequence: 2,
          stage: STAGES.HR,
          assignedRole: STAGES.HR,
          assignedEmployeeId: null,
          status: STEP_STATUS.PENDING,
        },
      ];

  return txOrPrisma.approvalInstance.create({
    data: {
      subjectType,
      subjectId,
      requesterEmployeeId,
      departmentId: requester.departmentId,
      branchId: requester.branchId,
      currentStage: hasSupervisor ? STAGES.SUPERVISOR : STAGES.HR,
      status: hasSupervisor ? INSTANCE_STATUS.PENDING_SUPERVISOR : INSTANCE_STATUS.PENDING_HR,
      metadata: metadata ?? {},
      steps: { create: steps },
    },
    include: approvalInclude,
  });
}

export async function getInbox(
  user: AuthUser,
  query: ApprovalInboxQueryInput,
): Promise<ApprovalInboxResult>;
export async function getInbox(
  db: ApprovalDb,
  user: AuthUser,
  query: ApprovalInboxQueryInput,
): Promise<ApprovalInboxResult>;
export async function getInbox(
  first: ApprovalDb | AuthUser,
  second: AuthUser | ApprovalInboxQueryInput,
  third?: ApprovalInboxQueryInput,
): Promise<ApprovalInboxResult> {
  const db = isApprovalDb(first) ? first : defaultDb();
  const user = isApprovalDb(first) ? (second as AuthUser) : (first as AuthUser);
  const query = isApprovalDb(first) ? (third ?? {}) : (second as ApprovalInboxQueryInput);
  const params = buildPagination(query as Record<string, unknown>);
  const where = await inboxWhere(db, user, query);

  const [total, items] = await Promise.all([
    db.approvalInstance.count({ where }),
    db.approvalInstance.findMany({
      where,
      include: approvalInclude,
      orderBy: buildOrderBy(params, APPROVAL_SORT, 'submittedAt'),
      skip: params.skip,
      take: params.take,
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

export async function getApproval(id: string, user: AuthUser): Promise<ApprovalInstanceLike>;
export async function getApproval(
  db: ApprovalDb,
  id: string,
  user: AuthUser,
): Promise<ApprovalInstanceLike>;
export async function getApproval(
  first: ApprovalDb | string,
  second: string | AuthUser,
  third?: AuthUser,
): Promise<ApprovalInstanceLike> {
  const db = isApprovalDb(first) ? first : defaultDb();
  const id = isApprovalDb(first) ? (second as string) : (first as string);
  const user = isApprovalDb(first) ? third! : (second as AuthUser);

  const instance = await db.approvalInstance.findUnique({
    where: { id },
    include: approvalInclude,
  });
  if (!instance) throw notFound('Approval not found');

  await assertCanReadApproval(db, user, instance);
  return instance;
}

async function approveSubject(
  tx: Prisma.TransactionClient,
  instance: ApprovalInstanceLike,
  user: AuthUser,
  decidedAt: Date,
  note: string | undefined,
) {
  if (instance.subjectType === ApprovalSubjectType.DTR_PERIOD) {
    await tx.dtrPeriod.update({
      where: { id: instance.subjectId },
      data: {
        status: DtrPeriodStatus.APPROVED,
        hrApprovedAt: decidedAt,
        hrApprovedById: user.id,
        version: { increment: 1 },
      },
    });
    return;
  }

  if (instance.subjectType === ApprovalSubjectType.ATTENDANCE_CORRECTION) {
    await applyAttendanceCorrection(tx, {
      id: instance.subjectId,
      reviewedById: user.id,
      reviewedAt: decidedAt,
      reviewNote: note ?? null,
    });
  }
}

async function rejectSubject(
  tx: Prisma.TransactionClient,
  instance: ApprovalInstanceLike,
  user: AuthUser,
  decidedAt: Date,
  note: string,
) {
  if (instance.subjectType === ApprovalSubjectType.DTR_PERIOD) {
    await tx.dtrPeriod.update({
      where: { id: instance.subjectId },
      data: {
        status: DtrPeriodStatus.REOPENED,
        reopenedAt: decidedAt,
        reopenedById: user.id,
        lockReason: note,
        version: { increment: 1 },
      },
    });
    return;
  }

  if (instance.subjectType === ApprovalSubjectType.ATTENDANCE_CORRECTION) {
    await rejectAttendanceCorrection(tx, {
      id: instance.subjectId,
      reviewedById: user.id,
      reviewedAt: decidedAt,
      reviewNote: note,
    });
  }
}

export async function actOnApproval(
  req: Request,
  user: AuthUser,
  id: string,
  input: ApprovalActionInput,
): Promise<ApprovalInstanceLike>;
export async function actOnApproval(
  req: Request,
  db: ApprovalTransactionalDb,
  user: AuthUser,
  id: string,
  input: ApprovalActionInput,
): Promise<ApprovalInstanceLike>;
export async function actOnApproval(
  req: Request,
  second: ApprovalTransactionalDb | AuthUser,
  third: AuthUser | string,
  fourth: string | ApprovalActionInput,
  fifth?: ApprovalActionInput,
): Promise<ApprovalInstanceLike> {
  const db = isApprovalDb(second) ? second : defaultDb();
  const user = isApprovalDb(second) ? (third as AuthUser) : (second as AuthUser);
  const id = isApprovalDb(second) ? (fourth as string) : (third as string);
  const input = isApprovalDb(second) ? fifth! : (fourth as ApprovalActionInput);

  const note = input.note?.trim();
  if (input.decision === DECISION.REJECT && !note) {
    throw badRequest('A note is required when rejecting');
  }

  const existing = await db.approvalInstance.findUnique({
    where: { id },
    include: approvalInclude,
  });
  if (!existing) throw notFound('Approval not found');
  if (existing.status !== INSTANCE_STATUS.PENDING_SUPERVISOR && existing.status !== INSTANCE_STATUS.PENDING_HR) {
    throw badRequest(`Only pending approvals can be acted on (current: ${existing.status})`);
  }

  const step = currentPendingStep(existing);
  if (!step) throw badRequest('No pending approval step is available');
  await assertCanActOnStep(db, user, existing, step);

  const decidedAt = new Date();
  const updated = await db.$transaction(async (tx) => {
    const stepUpdate = await tx.approvalStep.updateMany({
      where: { id: step.id, status: STEP_STATUS.PENDING },
      data: {
        status: input.decision === DECISION.APPROVE ? STEP_STATUS.APPROVED : STEP_STATUS.REJECTED,
        decidedByUserId: user.id,
        decidedAt,
        decision: input.decision,
        note: note ?? null,
        oldValues: { status: step.status },
        newValues: {
          status: input.decision === DECISION.APPROVE ? STEP_STATUS.APPROVED : STEP_STATUS.REJECTED,
        },
      },
    });
    if (stepUpdate.count !== 1) {
      throw conflict('This approval step has already been decided');
    }

    if (input.decision === DECISION.REJECT) {
      await tx.approvalInstance.update({
        where: { id },
        data: {
          status: INSTANCE_STATUS.REJECTED,
          completedAt: decidedAt,
        },
      });
      await rejectSubject(tx as unknown as Prisma.TransactionClient, existing, user, decidedAt, note!);
    } else if (step.stage === STAGES.SUPERVISOR) {
      await tx.approvalStep.create({
        data: {
          instanceId: id,
          sequence: maxStepSequence(existing) + 1,
          stage: STAGES.HR,
          assignedRole: STAGES.HR,
          assignedEmployeeId: null,
          status: STEP_STATUS.PENDING,
        },
      });
      await tx.approvalInstance.update({
        where: { id },
        data: {
          status: INSTANCE_STATUS.PENDING_HR,
          currentStage: STAGES.HR,
        },
      });
    } else if (step.stage === STAGES.HR) {
      await tx.approvalInstance.update({
        where: { id },
        data: {
          status: INSTANCE_STATUS.APPROVED,
          completedAt: decidedAt,
        },
      });
      await approveSubject(tx as unknown as Prisma.TransactionClient, existing, user, decidedAt, note);
    }

    const reloaded = await tx.approvalInstance.findUnique({
      where: { id },
      include: approvalInclude,
    });
    if (!reloaded) throw notFound('Approval not found');
    return reloaded;
  });

  await audit(req, {
    action:
      input.decision === DECISION.REJECT
        ? 'APPROVAL_REJECTED'
        : updated.status === INSTANCE_STATUS.APPROVED
          ? 'APPROVAL_APPROVED'
          : 'APPROVAL_ADVANCED',
    module: MODULES.APPROVAL,
    description: `Approval ${input.decision.toLowerCase()}d at ${step.stage}`,
    employeeId: existing.requesterEmployeeId,
    oldValues: { status: existing.status, stepId: step.id },
    newValues: { status: updated.status, decision: input.decision, note: note ?? null },
  });

  return updated;
}
