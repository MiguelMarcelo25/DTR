import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Params
// ─────────────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const employeeIdParamSchema = z.object({
  employeeId: z.string().uuid(),
});

// ─────────────────────────────────────────────────────────────
// Leave types
// ─────────────────────────────────────────────────────────────

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  defaultDays: z.coerce.number().min(0).max(9999).default(0),
  isPaid: z.boolean().default(true),
});

export const updateLeaveTypeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    defaultDays: z.coerce.number().min(0).max(9999).optional(),
    isPaid: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

// ─────────────────────────────────────────────────────────────
// Leave requests
// ─────────────────────────────────────────────────────────────

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(1000).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['startDate'],
  });

export const listLeaveRequestsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
});

export const reviewLeaveRequestSchema = z.object({
  reviewNote: z.string().max(1000).optional(),
});

export const rejectLeaveRequestSchema = z.object({
  reviewNote: z.string().min(1, 'A reason is required when rejecting').max(1000),
});

// ─────────────────────────────────────────────────────────────
// Leave balances
// ─────────────────────────────────────────────────────────────

export const listLeaveBalancesSchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export const getEmployeeBalancesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export const adjustLeaveBalanceSchema = z
  .object({
    leaveTypeId: z.string().uuid(),
    year: z.coerce.number().int().min(2000).max(3000).optional(),
    entitled: z.coerce.number().min(0).max(9999).optional(),
    used: z.coerce.number().min(0).max(9999).optional(),
  })
  .refine((v) => v.entitled !== undefined || v.used !== undefined, {
    message: 'Provide at least one of entitled or used',
  });

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

export const leaveReportSchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ListLeaveRequestsInput = z.infer<typeof listLeaveRequestsSchema>;
export type RejectLeaveRequestInput = z.infer<typeof rejectLeaveRequestSchema>;
export type AdjustLeaveBalanceInput = z.infer<typeof adjustLeaveBalanceSchema>;
export type LeaveReportInput = z.infer<typeof leaveReportSchema>;
