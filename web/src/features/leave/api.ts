import { api } from '@/lib/api';
import type { ApiResponse, Paginated } from '@/types';

// ─────────────────────────────────────────────────────────────
// Domain types (mirror the API service include shapes). Decimal
// fields arrive as number | string — coerce with Number() to display.
// ─────────────────────────────────────────────────────────────

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  defaultDays: number | string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRef {
  id: string;
  employeeNo: string;
  profile?: { firstName: string; lastName: string } | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number | string;
  reason: string | null;
  status: LeaveStatus;
  reviewedById: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  leaveType?: { id: string; name: string; isPaid: boolean };
  employee?: EmployeeRef;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  entitled: number | string;
  used: number | string;
  remaining: number | string;
  createdAt?: string;
  updatedAt?: string;
  leaveType?: {
    id: string;
    name: string;
    isPaid: boolean;
    defaultDays: number | string;
  };
  employee?: EmployeeRef;
}

export interface LeaveReport {
  summary: {
    total: number;
    byStatus: Record<string, number>;
    approvedDays: number;
  };
  requests: LeaveRequest[];
}

// ─────────────────────────────────────────────────────────────
// Query params
// ─────────────────────────────────────────────────────────────

export interface ListRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
}

export interface BalanceParams {
  employeeId?: string;
  leaveTypeId?: string;
  year?: number;
}

export interface ReportParams {
  year?: number;
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}

// ─────────────────────────────────────────────────────────────
// Leave types
// ─────────────────────────────────────────────────────────────

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const res = await api.get<ApiResponse<LeaveType[]>>('/leave/types');
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Leave balances
// ─────────────────────────────────────────────────────────────

export async function fetchLeaveBalances(params: BalanceParams = {}): Promise<LeaveBalance[]> {
  const res = await api.get<ApiResponse<LeaveBalance[]>>('/leave/balances', { params });
  return res.data.data;
}

export async function fetchEmployeeBalances(
  employeeId: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const res = await api.get<ApiResponse<LeaveBalance[]>>(`/leave/balances/${employeeId}`, {
    params: { year },
  });
  return res.data.data;
}

export interface AdjustBalancePayload {
  leaveTypeId: string;
  year?: number;
  entitled?: number;
  used?: number;
}

export async function adjustLeaveBalance(
  employeeId: string,
  payload: AdjustBalancePayload,
): Promise<LeaveBalance> {
  const res = await api.put<ApiResponse<LeaveBalance>>(`/leave/balances/${employeeId}`, payload);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Leave requests
// ─────────────────────────────────────────────────────────────

export async function fetchLeaveRequests(
  params: ListRequestsParams = {},
): Promise<Paginated<LeaveRequest>> {
  const res = await api.get<ApiResponse<LeaveRequest[]>>('/leave/requests', { params });
  return { items: res.data.data, meta: res.data.meta! };
}

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  const res = await api.post<ApiResponse<LeaveRequest>>('/leave/requests', payload);
  return res.data.data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const res = await api.put<ApiResponse<LeaveRequest>>(`/leave/requests/${id}/cancel`, {});
  return res.data.data;
}

export async function approveLeaveRequest(
  id: string,
  reviewNote?: string,
): Promise<LeaveRequest> {
  const res = await api.put<ApiResponse<LeaveRequest>>(`/leave/requests/${id}/approve`, {
    reviewNote: reviewNote || undefined,
  });
  return res.data.data;
}

export async function rejectLeaveRequest(id: string, reviewNote: string): Promise<LeaveRequest> {
  const res = await api.put<ApiResponse<LeaveRequest>>(`/leave/requests/${id}/reject`, {
    reviewNote,
  });
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

export async function fetchLeaveReport(params: ReportParams = {}): Promise<LeaveReport> {
  const res = await api.get<ApiResponse<LeaveReport>>('/leave/reports', { params });
  return res.data.data;
}

/** Download the CSV export and trigger a browser save. */
export async function exportLeaveReport(params: ReportParams = {}): Promise<void> {
  const res = await api.get('/leave/reports/export', { params, responseType: 'blob' });
  const blob = new Blob([res.data as BlobPart], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leave-report.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

export function employeeLabel(emp?: EmployeeRef | null): string {
  if (!emp) return '—';
  const name = emp.profile ? `${emp.profile.firstName} ${emp.profile.lastName}`.trim() : '';
  return name ? `${name} (${emp.employeeNo})` : emp.employeeNo;
}
