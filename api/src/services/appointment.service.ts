import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES, ROLES } from '../config/constants';
import { startOfDay } from '../utils/dateTime';
import { badRequest, conflict, notFound } from '../utils/errors';
import { ensureSelfOrPrivileged, isPrivileged } from '../utils/access';
import { buildMeta, buildOrderBy, buildPagination } from '../utils/pagination';
import { writeAudit, type AuditEntry } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';
import type { AuthUser, PaginationMeta } from '../types';

interface Ctx {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Capacity statuses that consume a slot's capacity. */
const ACTIVE_SLOT_STATUSES: Prisma.AppointmentWhereInput['status'] = {
  in: ['PENDING', 'APPROVED'],
};

/** Statuses for which an appointment is still "live" (not closed out). */
const LIVE_STATUSES: ('PENDING' | 'APPROVED' | 'RESCHEDULED')[] = [
  'PENDING',
  'APPROVED',
  'RESCHEDULED',
];

const appointmentInclude = {
  slot: true,
  employee: {
    select: {
      id: true,
      employeeNo: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

async function audit(entry: Omit<AuditEntry, 'module'> & Ctx): Promise<void> {
  await writeAudit({ ...entry, module: MODULES.APPOINTMENT });
}

/** Notify all HR / Admin / Super Admin users about a new/changed appointment. */
async function notifyHr(title: string, message: string, link: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: { role: { name: { in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR] } } },
      },
    },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      notify({ userId: u.id, type: 'APPOINTMENT', title, message, link }),
    ),
  );
}

/** Notify the owning employee about a status change on their appointment. */
async function notifyEmployee(
  employeeId: string,
  title: string,
  message: string,
  link: string,
): Promise<void> {
  const userId = await userIdForEmployee(employeeId);
  if (userId) await notify({ userId, type: 'APPOINTMENT', title, message, link });
}

/**
 * Reject a booking that would double-book: either the slot is at capacity, or the
 * same employee already holds a live appointment on that slot.
 */
async function assertNoDoubleBooking(
  slotId: string,
  employeeId: string,
  ignoreAppointmentId?: string,
): Promise<void> {
  const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw notFound('Appointment slot not found');
  if (!slot.isActive) throw badRequest('This slot is not available for booking', 'SLOT_INACTIVE');

  // Same employee already booked into this slot
  const existingForEmployee = await prisma.appointment.findFirst({
    where: {
      slotId,
      employeeId,
      status: ACTIVE_SLOT_STATUSES,
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (existingForEmployee) {
    throw conflict('You have already booked this slot', { code: 'ALREADY_BOOKED' });
  }

  // Capacity check: count APPROVED + PENDING appointments for the slot
  const booked = await prisma.appointment.count({
    where: {
      slotId,
      status: ACTIVE_SLOT_STATUSES,
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
  });
  if (booked >= slot.capacity) {
    throw conflict('This slot is fully booked', { code: 'SLOT_FULL', capacity: slot.capacity });
  }
}

async function getAppointmentOrThrow(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  if (!appointment) throw notFound('Appointment not found');
  return appointment;
}

// ─────────────────────────────────────────────────────────────
// SLOTS
// ─────────────────────────────────────────────────────────────

export interface ListSlotsFilters {
  date?: Date;
  from?: Date;
  to?: Date;
  isActive?: boolean;
}

export async function listSlots(query: Record<string, unknown>, filters: ListSlotsFilters) {
  const params = buildPagination(query);

  const where: Prisma.AppointmentSlotWhereInput = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.date) {
    where.date = startOfDay(filters.date);
  } else if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) (where.date as Prisma.DateTimeFilter).gte = startOfDay(filters.from);
    if (filters.to) (where.date as Prisma.DateTimeFilter).lte = startOfDay(filters.to);
  }
  if (params.search) {
    where.OR = [
      { location: { contains: params.search, mode: 'insensitive' } },
      { purpose: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy = buildOrderBy(params, ['date', 'startTime', 'capacity', 'createdAt'], 'date');

  const [total, items] = await Promise.all([
    prisma.appointmentSlot.count({ where }),
    prisma.appointmentSlot.findMany({ where, skip: params.skip, take: params.take, orderBy }),
  ]);

  return { items, meta: buildMeta(total, params) as PaginationMeta };
}

export async function createSlot(
  data: {
    date: Date;
    startTime: string;
    endTime: string;
    capacity: number;
    location?: string;
    purpose?: string;
    isActive?: boolean;
  },
  user: AuthUser,
  ctx: Ctx,
) {
  if (data.endTime <= data.startTime) {
    throw badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  }

  const slot = await prisma.appointmentSlot.create({
    data: {
      date: startOfDay(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
      location: data.location ?? null,
      purpose: data.purpose ?? null,
      isActive: data.isActive ?? true,
    },
  });

  await audit({
    userId: user.id,
    action: 'APPOINTMENT_SLOT_CREATED',
    description: `Created appointment slot on ${slot.date.toISOString().slice(0, 10)} ${slot.startTime}-${slot.endTime}`,
    newValues: slot,
    ...ctx,
  });

  return slot;
}

export async function updateSlot(
  id: string,
  data: {
    date?: Date;
    startTime?: string;
    endTime?: string;
    capacity?: number;
    location?: string | null;
    purpose?: string | null;
    isActive?: boolean;
  },
  user: AuthUser,
  ctx: Ctx,
) {
  const existing = await prisma.appointmentSlot.findUnique({ where: { id } });
  if (!existing) throw notFound('Appointment slot not found');

  const startTime = data.startTime ?? existing.startTime;
  const endTime = data.endTime ?? existing.endTime;
  if (endTime <= startTime) {
    throw badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  }

  if (data.capacity !== undefined && data.capacity < existing.capacity) {
    const booked = await prisma.appointment.count({
      where: { slotId: id, status: ACTIVE_SLOT_STATUSES },
    });
    if (data.capacity < booked) {
      throw conflict('Capacity cannot be lower than the number of active bookings', {
        booked,
      });
    }
  }

  const updateData: Prisma.AppointmentSlotUpdateInput = {};
  if (data.date !== undefined) updateData.date = startOfDay(data.date);
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.purpose !== undefined) updateData.purpose = data.purpose;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const slot = await prisma.appointmentSlot.update({ where: { id }, data: updateData });

  await audit({
    userId: user.id,
    action: 'APPOINTMENT_SLOT_UPDATED',
    description: `Updated appointment slot ${id}`,
    oldValues: existing,
    newValues: slot,
    ...ctx,
  });

  return slot;
}

export async function deleteSlot(id: string, user: AuthUser, ctx: Ctx): Promise<void> {
  const existing = await prisma.appointmentSlot.findUnique({ where: { id } });
  if (!existing) throw notFound('Appointment slot not found');

  const active = await prisma.appointment.count({
    where: { slotId: id, status: ACTIVE_SLOT_STATUSES },
  });
  if (active > 0) {
    throw conflict('Cannot delete a slot that has active appointments', { active });
  }

  await prisma.appointmentSlot.delete({ where: { id } });

  await audit({
    userId: user.id,
    action: 'APPOINTMENT_SLOT_DELETED',
    description: `Deleted appointment slot ${id}`,
    oldValues: existing,
    ...ctx,
  });
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

export interface ListAppointmentsFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RESCHEDULED' | 'COMPLETED';
  employeeId?: string;
  from?: Date;
  to?: Date;
}

export async function listAppointments(
  query: Record<string, unknown>,
  filters: ListAppointmentsFilters,
  user: AuthUser,
) {
  const params = buildPagination(query);

  const where: Prisma.AppointmentWhereInput = {};

  // Scope: privileged users may see all (optionally filtered by employeeId);
  // employees only see their own.
  if (isPrivileged(user)) {
    if (filters.employeeId) where.employeeId = filters.employeeId;
  } else {
    if (!user.employeeId) {
      return { items: [], meta: buildMeta(0, params) as PaginationMeta };
    }
    where.employeeId = user.employeeId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.scheduledDate = {};
    if (filters.from) (where.scheduledDate as Prisma.DateTimeFilter).gte = startOfDay(filters.from);
    if (filters.to) (where.scheduledDate as Prisma.DateTimeFilter).lte = startOfDay(filters.to);
  }
  if (params.search) {
    where.purpose = { contains: params.search, mode: 'insensitive' };
  }

  const orderBy = buildOrderBy(
    params,
    ['scheduledDate', 'scheduledTime', 'status', 'createdAt'],
    'scheduledDate',
  );

  const [total, items] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy,
      include: appointmentInclude,
    }),
  ]);

  return { items, meta: buildMeta(total, params) as PaginationMeta };
}

export async function getAppointment(id: string, user: AuthUser) {
  const appointment = await getAppointmentOrThrow(id);
  ensureSelfOrPrivileged(user, appointment.employeeId);
  return appointment;
}

export async function getCalendar(
  filters: { from: Date; to: Date; employeeId?: string; status?: ListAppointmentsFilters['status'] },
  user: AuthUser,
) {
  const where: Prisma.AppointmentWhereInput = {
    scheduledDate: { gte: startOfDay(filters.from), lte: startOfDay(filters.to) },
  };

  if (isPrivileged(user)) {
    if (filters.employeeId) where.employeeId = filters.employeeId;
  } else {
    if (!user.employeeId) return [];
    where.employeeId = user.employeeId;
  }

  if (filters.status) where.status = filters.status;

  return prisma.appointment.findMany({
    where,
    orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    include: appointmentInclude,
  });
}

export async function bookAppointment(
  data: { slotId?: string; purpose: string; scheduledDate: Date; scheduledTime: string; note?: string },
  user: AuthUser,
  ctx: Ctx,
) {
  if (!user.employeeId) {
    throw badRequest('Your account is not linked to an employee record', 'NO_EMPLOYEE');
  }
  const employeeId = user.employeeId;

  if (data.slotId) {
    await assertNoDoubleBooking(data.slotId, employeeId);
  }

  const appointment = await prisma.appointment.create({
    data: {
      employeeId,
      slotId: data.slotId ?? null,
      purpose: data.purpose,
      scheduledDate: startOfDay(data.scheduledDate),
      scheduledTime: data.scheduledTime,
      status: 'PENDING',
      note: data.note ?? null,
    },
    include: appointmentInclude,
  });

  await audit({
    userId: user.id,
    employeeId,
    action: 'APPOINTMENT_BOOKED',
    description: `Booked appointment for ${appointment.scheduledDate.toISOString().slice(0, 10)} ${appointment.scheduledTime}`,
    newValues: appointment,
    ...ctx,
  });

  await notifyHr(
    'New appointment request',
    `${appointment.purpose} on ${appointment.scheduledDate.toISOString().slice(0, 10)} at ${appointment.scheduledTime}`,
    `/appointments/${appointment.id}`,
  );

  return appointment;
}

export async function rescheduleAppointment(
  id: string,
  data: { slotId?: string | null; scheduledDate?: Date; scheduledTime?: string; note?: string },
  user: AuthUser,
  ctx: Ctx,
) {
  const existing = await getAppointmentOrThrow(id);
  ensureSelfOrPrivileged(user, existing.employeeId);

  if (!LIVE_STATUSES.includes(existing.status as (typeof LIVE_STATUSES)[number])) {
    throw badRequest(
      `Cannot reschedule an appointment that is ${existing.status}`,
      'INVALID_STATUS',
    );
  }

  const newSlotId = data.slotId === undefined ? existing.slotId : data.slotId;
  if (newSlotId) {
    await assertNoDoubleBooking(newSlotId, existing.employeeId, existing.id);
  }

  // Keep history: create a NEW appointment linked via rescheduledFromId, and mark
  // the old one RESCHEDULED. Done atomically.
  const [, created] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id },
      data: { status: 'RESCHEDULED', reviewedById: user.id },
    }),
    prisma.appointment.create({
      data: {
        employeeId: existing.employeeId,
        slotId: newSlotId ?? null,
        purpose: existing.purpose,
        scheduledDate: data.scheduledDate ? startOfDay(data.scheduledDate) : existing.scheduledDate,
        scheduledTime: data.scheduledTime ?? existing.scheduledTime,
        status: 'PENDING',
        note: data.note ?? existing.note,
        rescheduledFromId: existing.id,
      },
      include: appointmentInclude,
    }),
  ]);

  await audit({
    userId: user.id,
    employeeId: existing.employeeId,
    action: 'APPOINTMENT_RESCHEDULED',
    description: `Rescheduled appointment ${id} -> ${created.id}`,
    oldValues: existing,
    newValues: created,
    ...ctx,
  });

  await notifyHr(
    'Appointment rescheduled',
    `${created.purpose} moved to ${created.scheduledDate.toISOString().slice(0, 10)} at ${created.scheduledTime}`,
    `/appointments/${created.id}`,
  );
  await notifyEmployee(
    existing.employeeId,
    'Appointment rescheduled',
    `Your appointment was rescheduled to ${created.scheduledDate.toISOString().slice(0, 10)} at ${created.scheduledTime}`,
    `/appointments/${created.id}`,
  );

  return created;
}

export async function cancelAppointment(id: string, note: string | undefined, user: AuthUser, ctx: Ctx) {
  const existing = await getAppointmentOrThrow(id);
  ensureSelfOrPrivileged(user, existing.employeeId);

  if (!LIVE_STATUSES.includes(existing.status as (typeof LIVE_STATUSES)[number])) {
    throw badRequest(`Cannot cancel an appointment that is ${existing.status}`, 'INVALID_STATUS');
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', reviewedById: user.id, note: note ?? existing.note },
    include: appointmentInclude,
  });

  await audit({
    userId: user.id,
    employeeId: existing.employeeId,
    action: 'APPOINTMENT_CANCELLED',
    description: `Cancelled appointment ${id}`,
    oldValues: existing,
    newValues: appointment,
    ...ctx,
  });

  await notifyEmployee(
    existing.employeeId,
    'Appointment cancelled',
    `Your appointment "${appointment.purpose}" was cancelled`,
    `/appointments/${appointment.id}`,
  );

  return appointment;
}

export async function approveAppointment(id: string, note: string | undefined, user: AuthUser, ctx: Ctx) {
  const existing = await getAppointmentOrThrow(id);

  if (existing.status !== 'PENDING') {
    throw badRequest(`Only pending appointments can be approved (is ${existing.status})`, 'INVALID_STATUS');
  }

  // Re-check capacity at approval time to avoid over-booking races.
  if (existing.slotId) {
    await assertNoDoubleBooking(existing.slotId, existing.employeeId, existing.id);
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'APPROVED', reviewedById: user.id, note: note ?? existing.note },
    include: appointmentInclude,
  });

  await audit({
    userId: user.id,
    employeeId: existing.employeeId,
    action: 'APPOINTMENT_APPROVED',
    description: `Approved appointment ${id}`,
    oldValues: existing,
    newValues: appointment,
    ...ctx,
  });

  await notifyEmployee(
    existing.employeeId,
    'Appointment approved',
    `Your appointment "${appointment.purpose}" on ${appointment.scheduledDate.toISOString().slice(0, 10)} at ${appointment.scheduledTime} was approved`,
    `/appointments/${appointment.id}`,
  );

  return appointment;
}

export async function rejectAppointment(id: string, note: string | undefined, user: AuthUser, ctx: Ctx) {
  const existing = await getAppointmentOrThrow(id);

  if (existing.status !== 'PENDING') {
    throw badRequest(`Only pending appointments can be rejected (is ${existing.status})`, 'INVALID_STATUS');
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'REJECTED', reviewedById: user.id, note: note ?? existing.note },
    include: appointmentInclude,
  });

  await audit({
    userId: user.id,
    employeeId: existing.employeeId,
    action: 'APPOINTMENT_REJECTED',
    description: `Rejected appointment ${id}`,
    oldValues: existing,
    newValues: appointment,
    ...ctx,
  });

  await notifyEmployee(
    existing.employeeId,
    'Appointment rejected',
    `Your appointment "${appointment.purpose}" was rejected${note ? `: ${note}` : ''}`,
    `/appointments/${appointment.id}`,
  );

  return appointment;
}

export async function completeAppointment(id: string, note: string | undefined, user: AuthUser, ctx: Ctx) {
  const existing = await getAppointmentOrThrow(id);

  if (existing.status !== 'APPROVED') {
    throw badRequest(
      `Only approved appointments can be completed (is ${existing.status})`,
      'INVALID_STATUS',
    );
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'COMPLETED', reviewedById: user.id, note: note ?? existing.note },
    include: appointmentInclude,
  });

  await audit({
    userId: user.id,
    employeeId: existing.employeeId,
    action: 'APPOINTMENT_COMPLETED',
    description: `Completed appointment ${id}`,
    oldValues: existing,
    newValues: appointment,
    ...ctx,
  });

  await notifyEmployee(
    existing.employeeId,
    'Appointment completed',
    `Your appointment "${appointment.purpose}" is marked as completed`,
    `/appointments/${appointment.id}`,
  );

  return appointment;
}

export async function getReports(filters: { from?: Date; to?: Date }) {
  const where: Prisma.AppointmentWhereInput = {};
  if (filters.from || filters.to) {
    where.scheduledDate = {};
    if (filters.from) (where.scheduledDate as Prisma.DateTimeFilter).gte = startOfDay(filters.from);
    if (filters.to) (where.scheduledDate as Prisma.DateTimeFilter).lte = startOfDay(filters.to);
  }

  const [total, byStatus] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
  ]);

  const statusCounts = byStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  return {
    total,
    byStatus: statusCounts,
    range: {
      from: filters.from ? startOfDay(filters.from) : null,
      to: filters.to ? startOfDay(filters.to) : null,
    },
  };
}
