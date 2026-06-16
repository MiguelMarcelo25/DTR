import { z } from 'zod';

/**
 * Submit-overtime-request form. The `date` is kept as an ISO `yyyy-mm-dd`
 * string (native <input type="date">); `hours` is a positive decimal up to 24.
 */
export const overtimeRequestSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  hours: z.coerce
    .number({ invalid_type_error: 'Hours is required' })
    .gt(0, 'Hours must be greater than 0')
    .max(24, 'Hours cannot exceed 24'),
  reason: z.string().max(1000, 'Reason is too long').optional().or(z.literal('')),
});

export type OvertimeRequestValues = z.infer<typeof overtimeRequestSchema>;

/** Privileged: reject an overtime request (an optional note). */
export const rejectOvertimeSchema = z.object({
  reviewNote: z.string().max(1000, 'Note is too long').optional().or(z.literal('')),
});

export type RejectOvertimeValues = z.infer<typeof rejectOvertimeSchema>;
