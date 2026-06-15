import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid() });

export const listQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ── Department ──
export const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
});

// ── Position ──
export const positionSchema = z.object({
  title: z.string().min(1),
  level: z.string().optional(),
  departmentId: z.string().uuid().optional().nullable(),
});

// ── Branch ──
export const branchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

// ── Schedule ──
export const scheduleSchema = z.object({
  name: z.string().min(1),
  timeIn: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  timeOut: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  breakMinutes: z.coerce.number().int().min(0).default(60),
  gracePeriodMinutes: z.coerce.number().int().min(0).default(0),
  workDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
});

// ── Users ──
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE']),
  employeeId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE']).optional(),
});
