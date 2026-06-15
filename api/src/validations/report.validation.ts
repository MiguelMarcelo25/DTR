import { z } from 'zod';

/**
 * Shared report filters. All optional so each report can run unfiltered.
 * Dates are coerced from query strings; numbers via z.coerce on pagination.
 */
export const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

/** Datasets the generic exporter can stream. */
export const REPORT_TYPES = [
  'attendance',
  'dtr',
  'late',
  'undertime',
  'absences',
  'leave',
  'appointments',
  'payroll',
  'employees',
  'employee-background',
] as const;

export const exportQuerySchema = reportQuerySchema.extend({
  type: z.enum(REPORT_TYPES),
  format: z.enum(['csv', 'pdf']).default('csv'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
export type ReportType = (typeof REPORT_TYPES)[number];
