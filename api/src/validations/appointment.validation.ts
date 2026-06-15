import { z } from 'zod';

/** "HH:mm" 24-hour clock time string. */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

// ─────────────────────────────────────────────────────────────
// PARAMS
// ─────────────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid('A valid id is required'),
});

// ─────────────────────────────────────────────────────────────
// APPOINTMENT SLOTS
// ─────────────────────────────────────────────────────────────

export const listSlotsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const createSlotSchema = z.object({
  date: z.coerce.date(),
  startTime: timeString,
  endTime: timeString,
  capacity: z.coerce.number().int().positive().default(1),
  location: z.string().trim().min(1).optional(),
  purpose: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateSlotSchema = z
  .object({
    date: z.coerce.date().optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    capacity: z.coerce.number().int().positive().optional(),
    location: z.string().trim().min(1).nullable().optional(),
    purpose: z.string().trim().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

export const listAppointmentsQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'])
    .optional(),
  employeeId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const calendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  employeeId: z.string().uuid().optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'])
    .optional(),
});

export const reportsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const bookAppointmentSchema = z.object({
  slotId: z.string().uuid().optional(),
  purpose: z.string().trim().min(1, 'Purpose is required'),
  scheduledDate: z.coerce.date(),
  scheduledTime: timeString,
  note: z.string().trim().min(1).optional(),
});

export const rescheduleAppointmentSchema = z
  .object({
    slotId: z.string().uuid().nullable().optional(),
    scheduledDate: z.coerce.date().optional(),
    scheduledTime: timeString.optional(),
    note: z.string().trim().min(1).optional(),
  })
  .refine((v) => v.scheduledDate !== undefined || v.scheduledTime !== undefined || v.slotId !== undefined, {
    message: 'Provide a new date, time, or slot to reschedule',
  });

export const cancelAppointmentSchema = z.object({
  note: z.string().trim().min(1).optional(),
});

export const approveAppointmentSchema = z.object({
  note: z.string().trim().min(1).optional(),
});

export const rejectAppointmentSchema = z.object({
  note: z.string().trim().min(1, 'A reason is required when rejecting').optional(),
});

export const completeAppointmentSchema = z.object({
  note: z.string().trim().min(1).optional(),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
