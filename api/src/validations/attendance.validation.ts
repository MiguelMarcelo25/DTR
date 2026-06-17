import { z } from 'zod';
import { AttendanceStatus, RequestStatus } from '@prisma/client';

/** Reusable id-in-params schema. */
export const idParamSchema = z.object({
  id: z.string().uuid('A valid id is required'),
});

/** Time-out body — optional daily work summary ("what I did today"). */
export const timeOutSchema = z.object({
  workSummary: z.string().max(2000, 'Please keep it under 2000 characters').optional(),
});

/** Attendance log list / report filters (privileged). */
export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Own attendance history (self; privileged may target another employee). */
export const attendanceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  employeeId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Monthly DTR — a single calendar month. */
export const monthlyDtrQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1970).max(2999),
  month: z.coerce.number().int().min(1).max(12),
});

/** Summary — by explicit date range OR by year+month. */
export const summaryQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1970).max(2999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** DTR period readiness for a single month. */
export const dtrReadinessQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1970).max(2999),
  month: z.coerce.number().int().min(1).max(12),
});

/** Self-submit a DTR period. */
export const submitDtrPeriodSchema = z.object({
  year: z.coerce.number().int().min(1970).max(2999),
  month: z.coerce.number().int().min(1).max(12),
});

/** Privileged DTR lock body. */
export const lockDtrPeriodSchema = z.object({
  lockReason: z.string().max(500).optional(),
});

/** Create an attendance correction request. */
export const createCorrectionSchema = z.object({
  date: z.coerce.date(),
  requestedTimeIn: z.coerce.date().optional(),
  requestedTimeOut: z.coerce.date().optional(),
  requestedBreakIn: z.coerce.date().optional(),
  requestedBreakOut: z.coerce.date().optional(),
  reason: z.string().min(1, 'A reason is required'),
});

/** List corrections (self own; privileged all). */
export const correctionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(RequestStatus).optional(),
});

/** Reject a correction — optional review note. */
export const rejectCorrectionSchema = z.object({
  reviewNote: z.string().optional(),
});

/** Approve a correction — optional review note. */
export const approveCorrectionSchema = z.object({
  reviewNote: z.string().optional(),
});

/** Reports filters (privileged). */
export const reportQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  year: z.coerce.number().int().min(1970).max(2999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;
export type MonthlyDtrQuery = z.infer<typeof monthlyDtrQuerySchema>;
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type DtrReadinessQuery = z.infer<typeof dtrReadinessQuerySchema>;
export type SubmitDtrPeriodInput = z.infer<typeof submitDtrPeriodSchema>;
export type LockDtrPeriodInput = z.infer<typeof lockDtrPeriodSchema>;
export type CreateCorrectionInput = z.infer<typeof createCorrectionSchema>;
export type CorrectionListQuery = z.infer<typeof correctionListQuerySchema>;
export type RejectCorrectionInput = z.infer<typeof rejectCorrectionSchema>;
export type ApproveCorrectionInput = z.infer<typeof approveCorrectionSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
