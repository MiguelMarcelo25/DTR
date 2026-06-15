import { z } from 'zod';

/** "HH:mm" 24-hour clock — mirrors the API timeString validator. */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

/** "YYYY-MM-DD" date — matches the value of a native <input type="date">. */
const dateString = z.string().min(1, 'Date is required');

// ─────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────

export const bookAppointmentSchema = z
  .object({
    slotId: z.string().uuid().optional().or(z.literal('')),
    purpose: z.string().trim().min(1, 'Purpose is required'),
    scheduledDate: dateString,
    scheduledTime: timeString,
    note: z.string().trim().optional(),
  });

export type BookAppointmentValues = z.infer<typeof bookAppointmentSchema>;

// ─────────────────────────────────────────────────────────────
// Reschedule
// ─────────────────────────────────────────────────────────────

export const rescheduleAppointmentSchema = z
  .object({
    scheduledDate: dateString,
    scheduledTime: timeString,
    note: z.string().trim().optional(),
  });

export type RescheduleAppointmentValues = z.infer<typeof rescheduleAppointmentSchema>;

// ─────────────────────────────────────────────────────────────
// Cancel / review (note only)
// ─────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  note: z.string().trim().optional(),
});

export type NoteValues = z.infer<typeof noteSchema>;

// ─────────────────────────────────────────────────────────────
// Slot create / update
// ─────────────────────────────────────────────────────────────

export const slotSchema = z
  .object({
    date: dateString,
    startTime: timeString,
    endTime: timeString,
    capacity: z.coerce.number().int().positive('Capacity must be at least 1'),
    location: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type SlotValues = z.infer<typeof slotSchema>;
