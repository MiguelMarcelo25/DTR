import type { Request } from 'express';
import { Prisma, type Holiday } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import { audit } from '../utils/audit';
import { conflict, notFound } from '../utils/errors';
import type {
  CreateHolidayInput,
  ListHolidaysInput,
  UpdateHolidayInput,
} from '../validations/holiday.validation';

/**
 * Parse a "YYYY-MM-DD" string into UTC-midnight so Prisma `@db.Date` stores the
 * correct business day on a UTC host (no off-by-one).
 */
function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Serialize a stored `@db.Date` back to the client as "YYYY-MM-DD". */
function serialize(h: Holiday) {
  return {
    id: h.id,
    date: h.date.toISOString().slice(0, 10),
    name: h.name,
    type: h.type,
  };
}

export async function listHolidays(query: ListHolidaysInput) {
  const where: Prisma.HolidayWhereInput = {};

  if (query.year) {
    // Whole calendar year [Jan 1 .. Jan 1 next year), in UTC to match @db.Date.
    where.date = {
      gte: new Date(Date.UTC(query.year, 0, 1)),
      lt: new Date(Date.UTC(query.year + 1, 0, 1)),
    };
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  return holidays.map(serialize);
}

export async function createHoliday(req: Request, input: CreateHolidayInput) {
  const date = parseDate(input.date);

  const existing = await prisma.holiday.findUnique({ where: { date } });
  if (existing) throw conflict('A holiday already exists on that date');

  const holiday = await prisma.holiday.create({
    data: {
      date,
      name: input.name,
      type: input.type,
    },
  });

  await audit(req, {
    action: 'HOLIDAY_CREATED',
    module: MODULES.HOLIDAY,
    description: `Holiday "${holiday.name}" created (${input.date})`,
    newValues: holiday,
  });

  return serialize(holiday);
}

export async function updateHoliday(req: Request, id: string, input: UpdateHolidayInput) {
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) throw notFound('Holiday not found');

  const date = input.date !== undefined ? parseDate(input.date) : undefined;

  // Guard the unique date constraint when the date changes.
  if (date && date.getTime() !== existing.date.getTime()) {
    const clash = await prisma.holiday.findUnique({ where: { date } });
    if (clash && clash.id !== id) {
      throw conflict('A holiday already exists on that date');
    }
  }

  const holiday = await prisma.holiday.update({
    where: { id },
    data: {
      date,
      name: input.name ?? undefined,
      type: input.type ?? undefined,
    },
  });

  await audit(req, {
    action: 'HOLIDAY_UPDATED',
    module: MODULES.HOLIDAY,
    description: `Holiday "${holiday.name}" updated`,
    oldValues: existing,
    newValues: holiday,
  });

  return serialize(holiday);
}

export async function deleteHoliday(req: Request, id: string) {
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) throw notFound('Holiday not found');

  await prisma.holiday.delete({ where: { id } });

  await audit(req, {
    action: 'HOLIDAY_DELETED',
    module: MODULES.HOLIDAY,
    description: `Holiday "${existing.name}" deleted (${existing.date.toISOString().slice(0, 10)})`,
    oldValues: existing,
  });
}
