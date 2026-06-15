import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Audit-log filters (client-side form state)
// ─────────────────────────────────────────────────────────────

export const auditLogFilterSchema = z.object({
  search: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AuditLogFilterValues = z.infer<typeof auditLogFilterSchema>;

// ─────────────────────────────────────────────────────────────
// Department form — mirrors DepartmentPayload (name, code?, description?)
// ─────────────────────────────────────────────────────────────

export const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

export type DepartmentValues = z.infer<typeof departmentSchema>;

// ─────────────────────────────────────────────────────────────
// Position form — mirrors PositionPayload (title, level?, departmentId?)
// `departmentId` uses the NONE sentinel for "no department" in the select.
// ─────────────────────────────────────────────────────────────

export const POSITION_DEPARTMENT_NONE = '__none__';

export const positionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  level: z.string().optional(),
  departmentId: z.string().optional(),
});

export type PositionValues = z.infer<typeof positionSchema>;

// ─────────────────────────────────────────────────────────────
// Branch form — mirrors BranchPayload (name, address?)
// ─────────────────────────────────────────────────────────────

export const branchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
});

export type BranchValues = z.infer<typeof branchSchema>;

// ─────────────────────────────────────────────────────────────
// Schedule form — mirrors SchedulePayload
// timeIn/timeOut are "HH:mm" strings; break/grace coerce to numbers;
// workDays are 0=Sun..6=Sat indices.
// ─────────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  timeIn: z.string().min(1, 'Time in is required'),
  timeOut: z.string().min(1, 'Time out is required'),
  breakMinutes: z.coerce.number().int().nonnegative('Must be 0 or more').optional(),
  gracePeriodMinutes: z.coerce.number().int().nonnegative('Must be 0 or more').optional(),
  workDays: z.array(z.number().int().min(0).max(6)),
});

export type ScheduleValues = z.infer<typeof scheduleSchema>;

// ─────────────────────────────────────────────────────────────
// User form — mirrors CreateUserPayload (email, password, role, employeeId?)
// ─────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  /** Role value — cast to RoleName at submit time (options come from the API). */
  role: z.string().min(1, 'Role is required'),
  employeeId: z.string().optional(),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
