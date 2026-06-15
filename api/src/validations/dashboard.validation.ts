import { z } from 'zod';

/**
 * Dashboard query schemas. All dashboard endpoints are read-only summaries with
 * no required input; the optional knobs below let the client tune chart windows.
 */

export const adminDashboardQuerySchema = z.object({
  /** Number of trailing days for the attendance-trend chart (1–30, default 7). */
  trendDays: z.coerce.number().int().min(1).max(30).optional(),
  /** Number of recent audit-log activities to return (1–50, default 10). */
  activityLimit: z.coerce.number().int().min(1).max(50).optional(),
});

export const hrDashboardQuerySchema = z.object({
  /** Window (in days) for "document expirations soon" (1–365, default 30). */
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
});

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
export type HrDashboardQuery = z.infer<typeof hrDashboardQuerySchema>;
