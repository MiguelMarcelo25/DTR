import { z } from 'zod';
import { RequestStatus } from '@prisma/client';

/** Reusable id-in-params schema. */
export const idParamSchema = z.object({
  id: z.string().uuid('A valid id is required'),
});

/** 'YYYY-MM-DD' calendar date (stored as UTC-midnight by the service). */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/** List overtime requests (self own; privileged all). */
export const overtimeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  employeeId: z.string().uuid().optional(),
});

/** Create an overtime request for the caller. */
export const createOvertimeSchema = z.object({
  date: dateOnly,
  hours: z.coerce
    .number()
    .positive('Hours must be greater than 0')
    .max(24, 'Hours cannot exceed 24'),
  reason: z.string().max(1000, 'Please keep it under 1000 characters').optional(),
});

/** Reject an overtime request — optional review note. */
export const rejectOvertimeSchema = z.object({
  reviewNote: z.string().max(1000, 'Please keep it under 1000 characters').optional(),
});

export type OvertimeListQuery = z.infer<typeof overtimeListQuerySchema>;
export type CreateOvertimeInput = z.infer<typeof createOvertimeSchema>;
export type RejectOvertimeInput = z.infer<typeof rejectOvertimeSchema>;
