import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta, RoleName } from '@/types';

// ─────────────────────────────────────────────────────────────
// Audit logs  (FULLY WIRED — backend: GET /audit-logs, GET /audit-logs/:id)
// ─────────────────────────────────────────────────────────────

/** Known audit modules (mirror api/src/config/constants.ts MODULES). */
export const AUDIT_MODULES = [
  'AUTH',
  'EMPLOYEE',
  'PROFILE',
  'ATTENDANCE',
  'LEAVE',
  'APPOINTMENT',
  'PAYROLL',
  'NOTIFICATION',
  'REPORT',
  'USER',
  'SETTINGS',
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];

export interface AuditLogUser {
  id: string;
  email: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  employeeId: string | null;
  action: string;
  module: string;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  oldValues: unknown | null;
  newValues: unknown | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'action' | 'module';
  order?: 'asc' | 'desc';
  search?: string;
  module?: string;
  action?: string;
  userId?: string;
  employeeId?: string;
  /** ISO date (yyyy-mm-dd) — maps to backend `from`. */
  from?: string;
  /** ISO date (yyyy-mm-dd) — maps to backend `to`. */
  to?: string;
}

/** GET /audit-logs — paginated list with filters. data = items[], meta = pagination. */
export async function listAuditLogs(params: ListAuditLogsParams): Promise<Paginated<AuditLog>> {
  const res = await api.get<ApiResponse<AuditLog[]>>('/audit-logs', { params });
  return {
    items: res.data.data,
    meta: res.data.meta as PaginationMeta,
  };
}

/** GET /audit-logs/:id — single audit log detail. */
export async function getAuditLog(id: string): Promise<AuditLog> {
  const res = await api.get<ApiResponse<AuditLog>>(`/audit-logs/${id}`);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Roles  (backend: GET /roles)
// ─────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
}

/** GET /roles — assignable roles for user management. */
export async function listRoles(): Promise<Role[]> {
  const res = await api.get<ApiResponse<Role[]>>('/roles');
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Users  (backend: GET/POST/PUT /users)
// ─────────────────────────────────────────────────────────────

export interface UserEmployee {
  id: string;
  employeeNo: string;
  name: string | null;
}

export interface User {
  id: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleName[];
  employee: UserEmployee | null;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: RoleName;
  employeeId?: string;
}

/** PUT /users/:id — toggles active state and/or changes role. */
export interface UpdateUserPayload {
  isActive?: boolean;
  role?: RoleName;
}

/** GET /users — paginated list. data = items[], meta = pagination. */
export async function listUsers(params: ListUsersParams): Promise<Paginated<User>> {
  const res = await api.get<ApiResponse<User[]>>('/users', { params });
  return {
    items: res.data.data,
    meta: res.data.meta as PaginationMeta,
  };
}

/** POST /users — create an account. */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const res = await api.post<ApiResponse<User>>('/users', payload);
  return res.data.data;
}

/** PUT /users/:id — update active state and/or role. */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const res = await api.put<ApiResponse<User>>(`/users/${id}`, payload);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Departments  (backend: GET/POST/PUT/DELETE /departments)
// ─────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { employees: number; positions: number };
}

export interface DepartmentPayload {
  name: string;
  code?: string;
  description?: string;
}

/** GET /departments — full list (soft-deleted excluded). */
export async function listDepartments(
  params: { search?: string } = {},
): Promise<Department[]> {
  const res = await api.get<ApiResponse<Department[]>>('/departments', { params });
  return res.data.data;
}

/** POST /departments. */
export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  const res = await api.post<ApiResponse<Department>>('/departments', payload);
  return res.data.data;
}

/** PUT /departments/:id. */
export async function updateDepartment(
  id: string,
  payload: Partial<DepartmentPayload>,
): Promise<Department> {
  const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, payload);
  return res.data.data;
}

/** DELETE /departments/:id (soft delete). */
export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}

// ─────────────────────────────────────────────────────────────
// Positions  (backend: GET/POST/PUT/DELETE /positions)
// ─────────────────────────────────────────────────────────────

export interface Position {
  id: string;
  title: string;
  level: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  _count: { employees: number };
}

export interface PositionPayload {
  title: string;
  level?: string;
  departmentId?: string;
}

/** GET /positions — full list. */
export async function listPositions(
  params: { search?: string } = {},
): Promise<Position[]> {
  const res = await api.get<ApiResponse<Position[]>>('/positions', { params });
  return res.data.data;
}

/** POST /positions. */
export async function createPosition(payload: PositionPayload): Promise<Position> {
  const res = await api.post<ApiResponse<Position>>('/positions', payload);
  return res.data.data;
}

/** PUT /positions/:id. */
export async function updatePosition(
  id: string,
  payload: Partial<PositionPayload>,
): Promise<Position> {
  const res = await api.put<ApiResponse<Position>>(`/positions/${id}`, payload);
  return res.data.data;
}

/** DELETE /positions/:id. */
export async function deletePosition(id: string): Promise<void> {
  await api.delete(`/positions/${id}`);
}

// ─────────────────────────────────────────────────────────────
// Branches  (backend: GET/POST/PUT/DELETE /branches)
// ─────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  _count: { employees: number };
}

export interface BranchPayload {
  name: string;
  address?: string;
}

/** GET /branches — full list. */
export async function listBranches(
  params: { search?: string } = {},
): Promise<Branch[]> {
  const res = await api.get<ApiResponse<Branch[]>>('/branches', { params });
  return res.data.data;
}

/** POST /branches. */
export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const res = await api.post<ApiResponse<Branch>>('/branches', payload);
  return res.data.data;
}

/** PUT /branches/:id. */
export async function updateBranch(
  id: string,
  payload: Partial<BranchPayload>,
): Promise<Branch> {
  const res = await api.put<ApiResponse<Branch>>(`/branches/${id}`, payload);
  return res.data.data;
}

/** DELETE /branches/:id. */
export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/branches/${id}`);
}

// ─────────────────────────────────────────────────────────────
// Schedules / Work shifts  (backend: GET/POST/PUT/DELETE /schedules)
// ─────────────────────────────────────────────────────────────

export interface Schedule {
  id: string;
  name: string;
  /** "HH:mm" */
  timeIn: string;
  /** "HH:mm" */
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  /** 0=Sun .. 6=Sat */
  workDays: number[];
  _count: { employees: number };
}

export interface SchedulePayload {
  name: string;
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  workDays: number[];
}

/** GET /schedules — full list. */
export async function listSchedules(
  params: { search?: string } = {},
): Promise<Schedule[]> {
  const res = await api.get<ApiResponse<Schedule[]>>('/schedules', { params });
  return res.data.data;
}

/** POST /schedules. */
export async function createSchedule(payload: SchedulePayload): Promise<Schedule> {
  const res = await api.post<ApiResponse<Schedule>>('/schedules', payload);
  return res.data.data;
}

/** PUT /schedules/:id. */
export async function updateSchedule(
  id: string,
  payload: Partial<SchedulePayload>,
): Promise<Schedule> {
  const res = await api.put<ApiResponse<Schedule>>(`/schedules/${id}`, payload);
  return res.data.data;
}

/** DELETE /schedules/:id. */
export async function deleteSchedule(id: string): Promise<void> {
  await api.delete(`/schedules/${id}`);
}

// ─────────────────────────────────────────────────────────────
// Settings  (NO BACKEND ENDPOINT — ready to wire)
// ─────────────────────────────────────────────────────────────

export interface SystemSettings {
  companyName?: string;
  timezone?: string;
  currency?: string;
  [key: string]: unknown;
}

/** MISSING ENDPOINT (ready to wire): GET /settings. */
export async function getSettings(): Promise<SystemSettings> {
  const res = await api.get<ApiResponse<SystemSettings>>('/settings');
  return res.data.data;
}

/** MISSING ENDPOINT (ready to wire): PUT /settings. */
export async function updateSettings(payload: SystemSettings): Promise<SystemSettings> {
  const res = await api.put<ApiResponse<SystemSettings>>('/settings', payload);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

export function userDisplayName(u: User): string {
  return u.employee?.name?.trim() || u.email;
}
