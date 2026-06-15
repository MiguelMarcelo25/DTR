import { z } from 'zod';
import { PayrollStatus } from '@prisma/client';

/** Params: a single UUID id. */
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

/** POST /payroll/process — kick off processing for a new period. */
export const processPayrollSchema = z
  .object({
    name: z.string().min(1, 'Period name is required').max(120),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    payDate: z.coerce.date().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

/** GET /payroll — list payroll periods. */
export const listPeriodsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(PayrollStatus).optional(),
});

/** GET /payroll/reports + /payroll/reports/export. */
export const payrollReportsQuerySchema = z.object({
  status: z.nativeEnum(PayrollStatus).optional(),
  periodId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/** GET /payslips — list payslips. */
export const listPayslipsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  periodId: z.string().uuid().optional(),
});

export type ProcessPayrollInput = z.infer<typeof processPayrollSchema>;
export type ListPeriodsQuery = z.infer<typeof listPeriodsQuerySchema>;
export type PayrollReportsQuery = z.infer<typeof payrollReportsQuerySchema>;
export type ListPayslipsQuery = z.infer<typeof listPayslipsQuerySchema>;
