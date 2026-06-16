import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Params
// ─────────────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ─────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────

/**
 * Calendar date as "YYYY-MM-DD". Kept as a string (NOT coerced to a Date) so
 * the service can parse it as UTC-midnight (`${date}T00:00:00.000Z`) and store
 * the correct business day on a UTC host.
 */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), {
    message: 'date is not a valid calendar date',
  });

const holidayType = z.enum(['REGULAR', 'SPECIAL_NON_WORKING', 'SPECIAL_WORKING']);

// ─────────────────────────────────────────────────────────────
// Holidays
// ─────────────────────────────────────────────────────────────

export const listHolidaysSchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export const createHolidaySchema = z.object({
  date: dateString,
  name: z.string().min(1, 'Name is required').max(150),
  type: holidayType.default('REGULAR'),
});

export const updateHolidaySchema = z
  .object({
    date: dateString.optional(),
    name: z.string().min(1).max(150).optional(),
    type: holidayType.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export type ListHolidaysInput = z.infer<typeof listHolidaysSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
