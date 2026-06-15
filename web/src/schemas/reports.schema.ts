import { z } from 'zod';

/**
 * Shared report-filter schema (mirrors the backend reportQuerySchema). All
 * fields are optional so each report can run unfiltered. Dates are kept as
 * `YYYY-MM-DD` strings (the value emitted by <input type="date">), then sent
 * verbatim as query params which the API coerces with z.coerce.date().
 */
export const reportFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
  search: z.string().optional(),
});

export type ReportFiltersValues = z.infer<typeof reportFiltersSchema>;
