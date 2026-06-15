import { z } from 'zod';

/**
 * Zod schemas for the Employee Management module. Query schemas coerce
 * numbers/dates so downstream handlers receive typed, sanitised input.
 */

const EMPLOYMENT_TYPES = [
  'REGULAR',
  'PROBATIONARY',
  'CONTRACTUAL',
  'PART_TIME',
  'INTERN',
] as const;

const EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'RESIGNED',
  'TERMINATED',
  'ON_LEAVE',
] as const;

const ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] as const;

/** Param schema for routes that take an :id. */
export const employeeIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** List + filter query. */
export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
});

/** Optional linked user account created alongside the employee. */
const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLE_NAMES).optional(),
});

/** Embedded profile fields used at creation time. */
const profileCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  civilStatus: z
    .enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'DIVORCED'])
    .optional(),
  nationality: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export const createEmployeeSchema = z.object({
  employeeNo: z.string().min(1).optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  scheduleId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  rank: z.string().optional(),
  dateHired: z.coerce.date(),
  regularizationDate: z.coerce.date().optional(),
  profile: profileCreateSchema,
  account: accountSchema.optional(),
});

export const updateEmployeeSchema = z
  .object({
    departmentId: z.string().uuid().nullable().optional(),
    positionId: z.string().uuid().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
    scheduleId: z.string().uuid().nullable().optional(),
    supervisorId: z.string().uuid().nullable().optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    rank: z.string().nullable().optional(),
    dateHired: z.coerce.date().optional(),
    regularizationDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
