import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import { isPrivileged, ensureSelfOrPrivileged } from '../utils/access';
import { audit } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';
import { inclusiveDays } from '../utils/dateTime';
import {
  buildPagination,
  buildMeta,
  buildOrderBy,
} from '../utils/pagination';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import type { AuthUser } from '../types';
import type {
  AdjustLeaveBalanceInput,
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  LeaveReportInput,
  ListLeaveRequestsInput,
  UpdateLeaveTypeInput,
} from '../validations/leave.validation';

const LEAVE_REQUEST_SORT = ['createdAt', 'startDate', 'endDate', 'status', 'days'];

function currentYear(): number {
  return new Date().getFullYear();
}

function yearOf(date: Date): number {
  return new Date(date).getFullYear();
}

/** Notify all active HR / privileged users (used when a request is submitted). */
async function notifyReviewers(title: string, message: string, link?: string): Promise<void> {
  const reviewers = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: { in: ['SUPER_ADMIN', 'ADMIN', 'HR'] } } } },
    },
    select: { id: true },
  });
  await Promise.all(
    reviewers.map((u) => notify({ userId: u.id, type: 'LEAVE', title, message, link })),
  );
}

// ─────────────────────────────────────────────────────────────
// Leave types
// ─────────────────────────────────────────────────────────────

export async function listLeaveTypes() {
  return prisma.leaveType.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}

export async function createLeaveType(req: Request, input: CreateLeaveTypeInput) {
  const existing = await prisma.leaveType.findUnique({ where: { name: input.name } });
  if (existing && !existing.deletedAt) {
    throw conflict('A leave type with that name already exists');
  }

  const leaveType = existing
    ? await prisma.leaveType.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          description: input.description,
          defaultDays: input.defaultDays,
          isPaid: input.isPaid,
          deletedAt: null,
        },
      })
    : await prisma.leaveType.create({
        data: {
          name: input.name,
          description: input.description,
          defaultDays: input.defaultDays,
          isPaid: input.isPaid,
        },
      });

  await audit(req, {
    action: 'LEAVE_TYPE_CREATED',
    module: MODULES.LEAVE,
    description: `Leave type "${leaveType.name}" created`,
    newValues: leaveType,
  });

  return leaveType;
}

export async function updateLeaveType(req: Request, id: string, input: UpdateLeaveTypeInput) {
  const existing = await prisma.leaveType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Leave type not found');

  if (input.name && input.name !== existing.name) {
    const clash = await prisma.leaveType.findUnique({ where: { name: input.name } });
    if (clash && clash.id !== id && !clash.deletedAt) {
      throw conflict('A leave type with that name already exists');
    }
  }

  const leaveType = await prisma.leaveType.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      description: input.description === undefined ? undefined : input.description,
      defaultDays: input.defaultDays ?? undefined,
      isPaid: input.isPaid ?? undefined,
    },
  });

  await audit(req, {
    action: 'LEAVE_TYPE_UPDATED',
    module: MODULES.LEAVE,
    description: `Leave type "${leaveType.name}" updated`,
    oldValues: existing,
    newValues: leaveType,
  });

  return leaveType;
}

export async function deleteLeaveType(req: Request, id: string) {
  const existing = await prisma.leaveType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Leave type not found');

  await prisma.leaveType.update({ where: { id }, data: { deletedAt: new Date() } });

  await audit(req, {
    action: 'LEAVE_TYPE_DELETED',
    module: MODULES.LEAVE,
    description: `Leave type "${existing.name}" deleted`,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Leave requests
// ─────────────────────────────────────────────────────────────

export async function listLeaveRequests(user: AuthUser, query: ListLeaveRequestsInput) {
  const params = buildPagination(query as Record<string, unknown>);

  const where: Prisma.LeaveRequestWhereInput = {};

  if (isPrivileged(user)) {
    if (query.employeeId) where.employeeId = query.employeeId;
  } else {
    // Non-privileged users can only see their own requests.
    if (!user.employeeId) throw forbidden('You can only access your own records');
    if (query.employeeId && query.employeeId !== user.employeeId) {
      throw forbidden('You can only access your own records');
    }
    where.employeeId = user.employeeId;
  }

  if (query.status) where.status = query.status;
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;

  const [total, items] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { id: true, name: true, isPaid: true } },
        employee: { select: { id: true, employeeNo: true } },
      },
      orderBy: buildOrderBy(params, LEAVE_REQUEST_SORT, 'createdAt'),
      skip: params.skip,
      take: params.take,
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

export async function getLeaveRequest(user: AuthUser, id: string) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: { select: { id: true, name: true, isPaid: true } },
      employee: { select: { id: true, employeeNo: true } },
    },
  });
  if (!request) throw notFound('Leave request not found');

  ensureSelfOrPrivileged(user, request.employeeId);

  return request;
}

export async function createLeaveRequest(
  req: Request,
  user: AuthUser,
  input: CreateLeaveRequestInput,
) {
  if (!user.employeeId) {
    throw forbidden('Only employees can submit leave requests');
  }
  const employeeId = user.employeeId;

  if (input.startDate > input.endDate) {
    throw badRequest('startDate must be on or before endDate');
  }

  const leaveType = await prisma.leaveType.findFirst({
    where: { id: input.leaveTypeId, deletedAt: null },
  });
  if (!leaveType) throw notFound('Leave type not found');

  // Reject if an APPROVED leave overlaps the requested range.
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });
  if (overlap) {
    throw conflict('You already have approved leave that overlaps these dates');
  }

  const days = inclusiveDays(input.startDate, input.endDate);

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      days: new Prisma.Decimal(days),
      reason: input.reason,
      status: 'PENDING',
    },
    include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
  });

  await audit(req, {
    action: 'LEAVE_REQUEST_SUBMITTED',
    module: MODULES.LEAVE,
    description: `Leave request submitted (${leaveType.name}, ${days} day(s))`,
    employeeId,
    newValues: request,
  });

  await notifyReviewers(
    'New leave request',
    `A leave request for ${leaveType.name} (${days} day(s)) is awaiting review.`,
    `/leave/requests/${request.id}`,
  );

  return request;
}

export async function cancelLeaveRequest(req: Request, user: AuthUser, id: string) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { leaveType: true },
  });
  if (!request) throw notFound('Leave request not found');

  // Only the owner may cancel their own request.
  if (!user.employeeId || user.employeeId !== request.employeeId) {
    throw forbidden('You can only cancel your own leave requests');
  }

  if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
    throw badRequest(`Cannot cancel a leave request that is ${request.status}`);
  }

  const wasApproved = request.status === 'APPROVED';

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Restore the balance that was consumed on approval (paid types only).
    if (wasApproved && request.leaveType.isPaid) {
      const year = yearOf(request.startDate);
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
      });
      if (balance) {
        const restored = balance.used.minus(request.days);
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: restored.lessThan(0) ? new Prisma.Decimal(0) : restored },
        });
      }
    }

    return result;
  });

  await audit(req, {
    action: 'LEAVE_CANCELLED',
    module: MODULES.LEAVE,
    description: `Leave request cancelled${wasApproved ? ' (balance restored)' : ''}`,
    employeeId: request.employeeId,
    oldValues: request,
    newValues: updated,
  });

  return updated;
}

export async function approveLeaveRequest(
  req: Request,
  user: AuthUser,
  id: string,
  reviewNote?: string,
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { leaveType: true },
  });
  if (!request) throw notFound('Leave request not found');

  if (request.status !== 'PENDING') {
    throw badRequest(`Only pending requests can be approved (current: ${request.status})`);
  }

  // Guard against approving a request that now overlaps another approved leave.
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: request.employeeId,
      status: 'APPROVED',
      id: { not: request.id },
      startDate: { lte: request.endDate },
      endDate: { gte: request.startDate },
    },
  });
  if (overlap) {
    throw conflict('This overlaps another approved leave for the employee');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });

    // Deduct balance for PAID leave types only.
    if (request.leaveType.isPaid) {
      const year = yearOf(request.startDate);
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
      });

      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used.plus(request.days) },
        });
      } else {
        await tx.leaveBalance.create({
          data: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
            entitled: request.leaveType.defaultDays,
            used: request.days,
          },
        });
      }
    }

    // Timeline event.
    await tx.employeeActivityTimeline.create({
      data: {
        employeeId: request.employeeId,
        eventType: 'LEAVE_APPROVED',
        description: `Leave approved: ${request.leaveType.name} (${request.days.toString()} day(s))`,
        createdById: user.id,
        metadata: {
          leaveRequestId: request.id,
          leaveTypeId: request.leaveTypeId,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate.toISOString(),
        },
      },
    });

    return result;
  });

  await audit(req, {
    action: 'LEAVE_APPROVED',
    module: MODULES.LEAVE,
    description: `Leave request approved (${request.leaveType.name})`,
    employeeId: request.employeeId,
    oldValues: request,
    newValues: updated,
  });

  const targetUserId = await userIdForEmployee(request.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: 'LEAVE',
      title: 'Leave approved',
      message: `Your ${request.leaveType.name} leave request has been approved.`,
      link: `/leave/requests/${request.id}`,
    });
  }

  return updated;
}

export async function rejectLeaveRequest(
  req: Request,
  user: AuthUser,
  id: string,
  reviewNote: string,
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { leaveType: true },
  });
  if (!request) throw notFound('Leave request not found');

  if (request.status !== 'PENDING') {
    throw badRequest(`Only pending requests can be rejected (current: ${request.status})`);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedById: user.id,
      reviewNote,
      reviewedAt: new Date(),
    },
  });

  await audit(req, {
    action: 'LEAVE_REJECTED',
    module: MODULES.LEAVE,
    description: `Leave request rejected (${request.leaveType.name})`,
    employeeId: request.employeeId,
    oldValues: request,
    newValues: updated,
  });

  const targetUserId = await userIdForEmployee(request.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: 'LEAVE',
      title: 'Leave rejected',
      message: `Your ${request.leaveType.name} leave request was rejected. Reason: ${reviewNote}`,
      link: `/leave/requests/${request.id}`,
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────
// Leave balances
// ─────────────────────────────────────────────────────────────

interface BalanceFilters {
  employeeId?: string;
  leaveTypeId?: string;
  year?: number;
}

function withRemaining<T extends { entitled: Prisma.Decimal; used: Prisma.Decimal }>(b: T) {
  return { ...b, remaining: b.entitled.minus(b.used) };
}

export async function listLeaveBalances(user: AuthUser, filters: BalanceFilters) {
  const year = filters.year ?? currentYear();
  const where: Prisma.LeaveBalanceWhereInput = { year };

  if (isPrivileged(user)) {
    if (filters.employeeId) where.employeeId = filters.employeeId;
  } else {
    if (!user.employeeId) throw forbidden('You can only access your own records');
    if (filters.employeeId && filters.employeeId !== user.employeeId) {
      throw forbidden('You can only access your own records');
    }
    where.employeeId = user.employeeId;
  }

  if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      leaveType: { select: { id: true, name: true, isPaid: true, defaultDays: true } },
      employee: { select: { id: true, employeeNo: true } },
    },
    orderBy: [{ employeeId: 'asc' }, { leaveTypeId: 'asc' }],
  });

  return balances.map(withRemaining);
}

export async function getEmployeeBalances(user: AuthUser, employeeId: string, year?: number) {
  ensureSelfOrPrivileged(user, employeeId);

  const resolvedYear = year ?? currentYear();
  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year: resolvedYear },
    include: {
      leaveType: { select: { id: true, name: true, isPaid: true, defaultDays: true } },
    },
    orderBy: { leaveTypeId: 'asc' },
  });

  return balances.map(withRemaining);
}

export async function adjustLeaveBalance(
  req: Request,
  employeeId: string,
  input: AdjustLeaveBalanceInput,
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw notFound('Employee not found');

  const leaveType = await prisma.leaveType.findFirst({
    where: { id: input.leaveTypeId, deletedAt: null },
  });
  if (!leaveType) throw notFound('Leave type not found');

  const year = input.year ?? currentYear();

  const existing = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: { employeeId, leaveTypeId: input.leaveTypeId, year },
    },
  });

  const balance = await prisma.leaveBalance.upsert({
    where: {
      employeeId_leaveTypeId_year: { employeeId, leaveTypeId: input.leaveTypeId, year },
    },
    create: {
      employeeId,
      leaveTypeId: input.leaveTypeId,
      year,
      entitled: input.entitled ?? leaveType.defaultDays,
      used: input.used ?? 0,
    },
    update: {
      entitled: input.entitled ?? undefined,
      used: input.used ?? undefined,
    },
    include: {
      leaveType: { select: { id: true, name: true, isPaid: true, defaultDays: true } },
    },
  });

  await audit(req, {
    action: 'LEAVE_BALANCE_ADJUSTED',
    module: MODULES.LEAVE,
    description: `Leave balance adjusted (${leaveType.name}, ${year})`,
    employeeId,
    oldValues: existing,
    newValues: balance,
  });

  return withRemaining(balance);
}

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

function reportWhere(filters: LeaveReportInput): Prisma.LeaveRequestWhereInput {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;

  const startFilter: Prisma.DateTimeFilter = {};
  if (filters.year) {
    startFilter.gte = new Date(filters.year, 0, 1);
    startFilter.lte = new Date(filters.year, 11, 31, 23, 59, 59, 999);
  }
  if (filters.startDate) startFilter.gte = filters.startDate;
  if (Object.keys(startFilter).length > 0) where.startDate = startFilter;

  if (filters.endDate) where.endDate = { lte: filters.endDate };

  return where;
}

export async function leaveReport(filters: LeaveReportInput) {
  const where = reportWhere(filters);

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      leaveType: { select: { id: true, name: true, isPaid: true } },
      employee: {
        select: {
          id: true,
          employeeNo: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const byStatus: Record<string, number> = {};
  let totalDays = new Prisma.Decimal(0);
  for (const r of requests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === 'APPROVED') totalDays = totalDays.plus(r.days);
  }

  return {
    summary: {
      total: requests.length,
      byStatus,
      approvedDays: totalDays.toNumber(),
    },
    requests,
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function leaveReportCsv(filters: LeaveReportInput): Promise<string> {
  const { requests } = await leaveReport(filters);

  const header = [
    'Employee No',
    'Employee Name',
    'Leave Type',
    'Paid',
    'Start Date',
    'End Date',
    'Days',
    'Status',
    'Reason',
    'Review Note',
    'Submitted At',
  ];

  const rows = requests.map((r) => {
    const name = r.employee.profile
      ? `${r.employee.profile.firstName} ${r.employee.profile.lastName}`
      : '';
    return [
      r.employee.employeeNo,
      name,
      r.leaveType.name,
      r.leaveType.isPaid ? 'Yes' : 'No',
      r.startDate.toISOString().slice(0, 10),
      r.endDate.toISOString().slice(0, 10),
      r.days.toString(),
      r.status,
      r.reason ?? '',
      r.reviewNote ?? '',
      r.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(',');
  });

  return [header.map(csvEscape).join(','), ...rows].join('\r\n');
}
