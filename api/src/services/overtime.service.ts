import type { Request } from 'express';
import { Prisma, RequestStatus, NotificationType } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES, PRIVILEGED_ROLES } from '../config/constants';
import type { AuthUser } from '../types';
import { conflict, forbidden, notFound } from '../utils/errors';
import { isPrivileged } from '../utils/access';
import { buildMeta, buildPagination } from '../utils/pagination';
import { audit } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Parse a 'YYYY-MM-DD' string into a UTC-midnight Date (stable @db.Date value). */
function parseBusinessDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Serialize a @db.Date back to its 'YYYY-MM-DD' calendar string. */
function dayKey(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Require the actor to have a linked employee record (self-service endpoints). */
function requireSelfEmployeeId(user: AuthUser): string {
  if (!user.employeeId) throw forbidden('No employee record is linked to your account');
  return user.employeeId;
}

const overtimeInclude = {
  employee: {
    select: {
      employeeNo: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.OvertimeRequestInclude;

type OvertimeWithEmployee = Prisma.OvertimeRequestGetPayload<{ include: typeof overtimeInclude }>;

/** Shape a row for the client: hours as number, date as 'YYYY-MM-DD'. */
function serialize(row: OvertimeWithEmployee) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: dayKey(row.date),
    hours: Number(row.hours),
    reason: row.reason,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    employee: row.employee
      ? {
          employeeNo: row.employee.employeeNo,
          profile: row.employee.profile
            ? { firstName: row.employee.profile.firstName, lastName: row.employee.profile.lastName }
            : null,
        }
      : undefined,
  };
}

async function getOvertimeOrThrow(id: string) {
  const overtime = await prisma.overtimeRequest.findUnique({
    where: { id },
    include: overtimeInclude,
  });
  if (!overtime) throw notFound('Overtime request not found');
  return overtime;
}

// ─────────────────────────────────────────────────────────────
// List & create
// ─────────────────────────────────────────────────────────────

interface ListFilters {
  status?: RequestStatus;
  employeeId?: string;
}

/** Paginated list. Employees see only their own; privileged see all. */
export async function list(user: AuthUser, query: Record<string, unknown>, filters: ListFilters) {
  const params = buildPagination(query);

  const where: Prisma.OvertimeRequestWhereInput = {};
  if (isPrivileged(user)) {
    if (filters.employeeId) where.employeeId = filters.employeeId;
  } else {
    where.employeeId = requireSelfEmployeeId(user);
  }
  if (filters.status) where.status = filters.status;

  const [total, rows] = await Promise.all([
    prisma.overtimeRequest.count({ where }),
    prisma.overtimeRequest.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: overtimeInclude,
    }),
  ]);

  return { items: rows.map(serialize), meta: buildMeta(total, params) };
}

interface CreateInput {
  date: string;
  hours: number;
  reason?: string;
}

/** Create a PENDING overtime request for the caller's linked employee. */
export async function create(req: Request, user: AuthUser, input: CreateInput) {
  const employeeId = requireSelfEmployeeId(user);
  const date = parseBusinessDate(input.date);

  const created = await prisma.overtimeRequest.create({
    data: {
      employeeId,
      date,
      hours: input.hours,
      reason: input.reason ?? null,
      status: RequestStatus.PENDING,
    },
    include: overtimeInclude,
  });

  await audit(req, {
    action: 'OVERTIME_REQUESTED',
    module: MODULES.OVERTIME,
    description: `Requested ${input.hours}h overtime for ${input.date}`,
    employeeId,
    newValues: { overtimeId: created.id, date: input.date, hours: input.hours },
  });

  // Notify HR / Admins of the pending request.
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
        type: NotificationType.SYSTEM,
        title: 'Overtime Request',
        message: `An overtime request of ${input.hours}h was submitted for ${input.date}.`,
        link: `/overtime/${created.id}`,
      }),
    ),
  );

  return serialize(created);
}

// ─────────────────────────────────────────────────────────────
// Review (privileged)
// ─────────────────────────────────────────────────────────────

/** Approve a PENDING request → APPROVED. */
export async function approve(req: Request, user: AuthUser, id: string) {
  const overtime = await getOvertimeOrThrow(id);
  if (overtime.status !== RequestStatus.PENDING) {
    throw conflict('This overtime request has already been reviewed');
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: RequestStatus.APPROVED,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
    include: overtimeInclude,
  });

  await audit(req, {
    action: 'OVERTIME_APPROVED',
    module: MODULES.OVERTIME,
    description: `Approved overtime for ${dayKey(overtime.date)}`,
    employeeId: overtime.employeeId,
    newValues: { overtimeId: id },
  });

  const targetUserId = await userIdForEmployee(overtime.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: NotificationType.SYSTEM,
      title: 'Overtime Approved',
      message: `Your overtime request for ${dayKey(overtime.date)} was approved.`,
      link: `/overtime/${id}`,
    });
  }

  return serialize(updated);
}

/** Reject a PENDING request → REJECTED (optional review note). */
export async function reject(req: Request, user: AuthUser, id: string, reviewNote?: string) {
  const overtime = await getOvertimeOrThrow(id);
  if (overtime.status !== RequestStatus.PENDING) {
    throw conflict('This overtime request has already been reviewed');
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: RequestStatus.REJECTED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
    include: overtimeInclude,
  });

  await audit(req, {
    action: 'OVERTIME_REJECTED',
    module: MODULES.OVERTIME,
    description: `Rejected overtime for ${dayKey(overtime.date)}`,
    employeeId: overtime.employeeId,
    newValues: { overtimeId: id, reviewNote: reviewNote ?? null },
  });

  const targetUserId = await userIdForEmployee(overtime.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: NotificationType.SYSTEM,
      title: 'Overtime Rejected',
      message: `Your overtime request for ${dayKey(overtime.date)} was rejected.`,
      link: `/overtime/${id}`,
    });
  }

  return serialize(updated);
}

// ─────────────────────────────────────────────────────────────
// Cancel (owner)
// ─────────────────────────────────────────────────────────────

/** Owner cancels their own request → CANCELLED, only while still PENDING. */
export async function cancel(req: Request, user: AuthUser, id: string) {
  const overtime = await getOvertimeOrThrow(id);

  const employeeId = requireSelfEmployeeId(user);
  if (overtime.employeeId !== employeeId) {
    throw forbidden('You can only cancel your own overtime requests');
  }
  if (overtime.status !== RequestStatus.PENDING) {
    throw conflict('Only pending overtime requests can be cancelled');
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: { status: RequestStatus.CANCELLED },
    include: overtimeInclude,
  });

  await audit(req, {
    action: 'OVERTIME_CANCELLED',
    module: MODULES.OVERTIME,
    description: `Cancelled overtime for ${dayKey(overtime.date)}`,
    employeeId,
    newValues: { overtimeId: id },
  });

  return serialize(updated);
}
