import { z } from 'zod';

/**
 * POST /payroll/process — start processing a new payroll period.
 * Mirrors the backend `processPayrollSchema` (name + date range, optional payDate).
 * Dates are kept as `YYYY-MM-DD` strings here (native date inputs); the API
 * coerces them with `z.coerce.date()`.
 */
export const processPayrollSchema = z
  .object({
    name: z.string().min(1, 'Period name is required').max(120, 'Too long'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    payDate: z.string().optional().or(z.literal('')),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type ProcessPayrollValues = z.infer<typeof processPayrollSchema>;
