import { z } from 'zod';

/**
 * Submit-leave-request form. Dates are kept as ISO `yyyy-mm-dd` strings (native
 * <input type="date">). The API accepts coercible date strings.
 */
export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid('Select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().max(1000, 'Reason is too long').optional().or(z.literal('')),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'Start date must be on or before end date',
    path: ['startDate'],
  });

export type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;

/** Privileged: adjust an employee's leave balance (entitled / used days). */
export const adjustBalanceSchema = z
  .object({
    leaveTypeId: z.string().uuid('Select a leave type'),
    year: z.coerce
      .number()
      .int()
      .min(2000)
      .max(3000)
      .optional(),
    entitled: z.coerce.number().min(0).max(9999).optional(),
    used: z.coerce.number().min(0).max(9999).optional(),
  })
  .refine((v) => v.entitled !== undefined || v.used !== undefined, {
    message: 'Provide at least one of entitled or used',
    path: ['entitled'],
  });

export type AdjustBalanceValues = z.infer<typeof adjustBalanceSchema>;

/** Privileged: reject a leave request (a reason is required). */
export const rejectRequestSchema = z.object({
  reviewNote: z.string().min(1, 'A reason is required when rejecting').max(1000),
});

export type RejectRequestValues = z.infer<typeof rejectRequestSchema>;

/** Privileged: approve a leave request (optional note). */
export const approveRequestSchema = z.object({
  reviewNote: z.string().max(1000).optional().or(z.literal('')),
});

export type ApproveRequestValues = z.infer<typeof approveRequestSchema>;
