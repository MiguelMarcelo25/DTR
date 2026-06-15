import type { Request } from 'express';
import type { TicketStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES, STAFF_ROLES } from '../config/constants';
import type { AuthUser } from '../types';
import { buildPagination, buildMeta } from '../utils/pagination';
import { badRequest, forbidden, notFound } from '../utils/errors';
import { audit } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';

const STATUS_ORDER: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function isStaff(user: AuthUser): boolean {
  return user.roles.some((r) => STAFF_ROLES.includes(r));
}

/** Detail include used for a single ticket. */
const ticketInclude = {
  client: { select: { id: true, email: true, clientProfile: { select: { fullName: true, company: true, phone: true } } } },
  assignee: { select: { id: true, employeeNo: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
} as const;

async function loadTicketOrThrow(id: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) throw notFound('Ticket not found');
  return ticket;
}

function assertAccess(user: AuthUser, clientId: string) {
  if (isStaff(user)) return;
  if (user.id === clientId) return;
  throw forbidden('You can only access your own tickets');
}

async function nextTicketNo(): Promise<string> {
  const count = await prisma.supportTicket.count();
  return `TKT-${String(count + 1).padStart(5, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// Create / list / detail
// ─────────────────────────────────────────────────────────────

export async function createTicket(
  req: Request,
  user: AuthUser,
  input: { subject: string; description: string; category: string; priority: string },
) {
  const ticketNo = await nextTicketNo();
  const boardOrder = await prisma.supportTicket.count({ where: { status: 'NEW' } });

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNo,
      subject: input.subject,
      description: input.description,
      category: input.category as never,
      priority: input.priority as never,
      status: 'NEW',
      boardOrder,
      clientId: user.id,
      events: {
        create: { type: 'CREATED', description: `Ticket created`, actorId: user.id },
      },
    },
    include: ticketInclude,
  });

  await audit(req, {
    action: 'TICKET_CREATED',
    module: MODULES.SUPPORT,
    description: `${ticketNo}: ${input.subject}`,
  });
  return ticket;
}

export async function listTickets(user: AuthUser, query: Record<string, unknown>) {
  const params = buildPagination(query);
  const where: Record<string, unknown> = { deletedAt: null };

  if (!isStaff(user)) where.clientId = user.id;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.category) where.category = query.category;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (params.search) {
    where.OR = [
      { subject: { contains: params.search, mode: 'insensitive' } },
      { ticketNo: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.order },
      include: { ...ticketInclude, _count: { select: { comments: true } } },
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

/** Kanban board grouped into the 5 status columns (staff only). */
export async function getBoard() {
  const tickets = await prisma.supportTicket.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: 'asc' }, { boardOrder: 'asc' }],
    include: { ...ticketInclude, _count: { select: { comments: true } } },
  });

  return {
    columns: STATUS_ORDER.map((status) => ({
      status,
      tickets: tickets.filter((t) => t.status === status),
    })),
  };
}

export async function getTicket(user: AuthUser, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...ticketInclude,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              clientProfile: { select: { fullName: true } },
              employee: { select: { profile: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      },
      attachments: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!ticket) throw notFound('Ticket not found');
  assertAccess(user, ticket.clientId);

  // Clients never see internal staff notes
  if (!isStaff(user)) {
    ticket.comments = ticket.comments.filter((c) => !c.isInternal);
  }
  return ticket;
}

// ─────────────────────────────────────────────────────────────
// Staff actions
// ─────────────────────────────────────────────────────────────

export async function updateTicket(
  req: Request,
  id: string,
  data: { subject?: string; description?: string; category?: string; priority?: string },
) {
  const existing = await loadTicketOrThrow(id);
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      subject: data.subject,
      description: data.description,
      category: data.category as never,
      priority: data.priority as never,
    },
    include: ticketInclude,
  });
  if (data.priority && data.priority !== existing.priority) {
    await prisma.supportTicketEvent.create({
      data: {
        ticketId: id,
        type: 'PRIORITY_CHANGED',
        description: `Priority: ${existing.priority} → ${data.priority}`,
        actorId: req.user?.id,
        fromValue: existing.priority,
        toValue: data.priority,
      },
    });
  }
  await audit(req, { action: 'TICKET_UPDATED', module: MODULES.SUPPORT, description: ticket.ticketNo });
  return ticket;
}

/** Kanban move: change status (column) and ordering. */
export async function moveTicket(
  req: Request,
  id: string,
  input: { status: TicketStatus; boardOrder?: number },
) {
  const existing = await loadTicketOrThrow(id);
  const now = new Date();

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      status: input.status,
      boardOrder: input.boardOrder ?? 0,
      resolvedAt: input.status === 'RESOLVED' ? existing.resolvedAt ?? now : existing.resolvedAt,
      closedAt: input.status === 'CLOSED' ? now : input.status === 'NEW' || input.status === 'OPEN' ? null : existing.closedAt,
    },
    include: ticketInclude,
  });

  if (existing.status !== input.status) {
    await prisma.supportTicketEvent.create({
      data: {
        ticketId: id,
        type: input.status === 'CLOSED' ? 'CLOSED' : 'STATUS_CHANGED',
        description: `Status: ${existing.status} → ${input.status}`,
        actorId: req.user?.id,
        fromValue: existing.status,
        toValue: input.status,
      },
    });
    await notify({
      userId: existing.clientId,
      type: 'SYSTEM',
      title: 'Support ticket updated',
      message: `${ticket.ticketNo} is now ${input.status.replace('_', ' ').toLowerCase()}.`,
      link: `/portal/tickets/${id}`,
    });
    await audit(req, {
      action: 'TICKET_STATUS_CHANGED',
      module: MODULES.SUPPORT,
      description: `${ticket.ticketNo}: ${existing.status} → ${input.status}`,
    });
  }
  return ticket;
}

export async function assignTicket(req: Request, id: string, assigneeId: string | null | undefined) {
  await loadTicketOrThrow(id);

  let label = 'Unassigned';
  if (assigneeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assigneeId },
      select: { id: true, profile: { select: { firstName: true, lastName: true } } },
    });
    if (!emp) throw badRequest('Assignee not found', 'INVALID_ASSIGNEE');
    label = emp.profile ? `${emp.profile.firstName} ${emp.profile.lastName}` : 'Staff';
  }

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { assigneeId: assigneeId ?? null },
    include: ticketInclude,
  });

  await prisma.supportTicketEvent.create({
    data: { ticketId: id, type: 'ASSIGNED', description: `Assigned to ${label}`, actorId: req.user?.id, toValue: label },
  });

  if (assigneeId) {
    const assigneeUserId = await userIdForEmployee(assigneeId);
    if (assigneeUserId) {
      await notify({
        userId: assigneeUserId,
        type: 'SYSTEM',
        title: 'Ticket assigned to you',
        message: `${ticket.ticketNo}: ${ticket.subject}`,
        link: `/dashboard/support`,
      });
    }
  }
  await audit(req, { action: 'TICKET_ASSIGNED', module: MODULES.SUPPORT, description: `${ticket.ticketNo} → ${label}` });
  return ticket;
}

// ─────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────

export async function addComment(
  req: Request,
  user: AuthUser,
  id: string,
  input: { body: string; isInternal?: boolean },
) {
  const ticket = await loadTicketOrThrow(id);
  assertAccess(user, ticket.clientId);

  const staff = isStaff(user);
  const isInternal = staff ? !!input.isInternal : false;

  const comment = await prisma.supportTicketComment.create({
    data: { ticketId: id, authorId: user.id, body: input.body, isInternal },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          clientProfile: { select: { fullName: true } },
          employee: { select: { profile: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  await prisma.supportTicketEvent.create({
    data: { ticketId: id, type: 'COMMENTED', description: isInternal ? 'Added an internal note' : 'Replied', actorId: user.id },
  });

  // Notify the other party
  if (staff && !isInternal) {
    await notify({
      userId: ticket.clientId,
      type: 'SYSTEM',
      title: 'New reply on your ticket',
      message: `${ticket.ticketNo}: ${ticket.subject}`,
      link: `/portal/tickets/${id}`,
    });
  } else if (!staff && ticket.assigneeId) {
    const assigneeUserId = await userIdForEmployee(ticket.assigneeId);
    if (assigneeUserId) {
      await notify({
        userId: assigneeUserId,
        type: 'SYSTEM',
        title: 'Client replied',
        message: `${ticket.ticketNo}: ${ticket.subject}`,
        link: `/dashboard/support`,
      });
    }
  }
  await audit(req, {
    action: 'TICKET_COMMENTED',
    module: MODULES.SUPPORT,
    description: `${ticket.ticketNo}${isInternal ? ' (internal note)' : ''}`,
  });
  return comment;
}

// ─────────────────────────────────────────────────────────────
// Attachments / events / delete
// ─────────────────────────────────────────────────────────────

export async function addAttachment(
  user: AuthUser,
  id: string,
  file: { fileName: string; fileUrl: string; filePath: string },
) {
  const ticket = await loadTicketOrThrow(id);
  assertAccess(user, ticket.clientId);
  return prisma.supportTicketAttachment.create({
    data: { ticketId: id, fileName: file.fileName, fileUrl: file.fileUrl, filePath: file.filePath, uploadedById: user.id },
  });
}

export async function listEvents(id: string) {
  await loadTicketOrThrow(id);
  return prisma.supportTicketEvent.findMany({ where: { ticketId: id }, orderBy: { createdAt: 'desc' } });
}

export async function deleteTicket(req: Request, id: string) {
  const ticket = await loadTicketOrThrow(id);
  await prisma.supportTicket.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, { action: 'TICKET_DELETED', module: MODULES.SUPPORT, description: ticket.ticketNo });
}

/** Lightweight stats for staff dashboards. */
export async function getStats() {
  const [open, unassigned, urgent, byStatus] = await Promise.all([
    prisma.supportTicket.count({ where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } }),
    prisma.supportTicket.count({ where: { deletedAt: null, assigneeId: null, status: { not: 'CLOSED' } } }),
    prisma.supportTicket.count({ where: { deletedAt: null, priority: 'URGENT', status: { not: 'CLOSED' } } }),
    prisma.supportTicket.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  return { open, unassigned, urgent, byStatus };
}
