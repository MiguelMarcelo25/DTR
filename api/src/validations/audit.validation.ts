import { z } from 'zod';

/** Allow-list of fields the audit log list may be sorted by. */
export const AUDIT_SORT_FIELDS = ['createdAt', 'action', 'module'] as const;

/** Query filters + pagination for GET /audit-logs. */
export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.enum(AUDIT_SORT_FIELDS).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().min(1).optional(),
  module: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  userId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Params for GET /audit-logs/:id. */
export const auditLogIdSchema = z.object({
  id: z.string().uuid(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;
export type AuditLogIdParams = z.infer<typeof auditLogIdSchema>;
