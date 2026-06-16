import { api } from '@/lib/api';
import type { ApiResponse, Paginated } from '@/types';

// ─────────────────────────────────────────────────────────────
// Domain types (mirror the API include shapes). `hours` arrives as a
// number; dates are returned as `yyyy-mm-dd` strings.
// ─────────────────────────────────────────────────────────────

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface EmployeeRef {
  employeeNo: string;
  profile?: { firstName: string; lastName: string } | null;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  reason: string | null;
  status: OvertimeStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  employee?: EmployeeRef;
}

// ─────────────────────────────────────────────────────────────
// Query params
// ─────────────────────────────────────────────────────────────

export interface ListOvertimeParams {
  page?: number;
  limit?: number;
  status?: OvertimeStatus;
  employeeId?: string;
}

// ─────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────

export async function fetchOvertimeRequests(
  params: ListOvertimeParams = {},
): Promise<Paginated<OvertimeRequest>> {
  const res = await api.get<ApiResponse<OvertimeRequest[]>>('/overtime', { params });
  return { items: res.data.data, meta: res.data.meta! };
}

export interface CreateOvertimePayload {
  date: string;
  hours: number;
  reason?: string;
}

export async function createOvertimeRequest(
  payload: CreateOvertimePayload,
): Promise<OvertimeRequest> {
  const res = await api.post<ApiResponse<OvertimeRequest>>('/overtime', payload);
  return res.data.data;
}

export async function approveOvertimeRequest(id: string): Promise<OvertimeRequest> {
  const res = await api.put<ApiResponse<OvertimeRequest>>(`/overtime/${id}/approve`, {});
  return res.data.data;
}

export async function rejectOvertimeRequest(
  id: string,
  reviewNote?: string,
): Promise<OvertimeRequest> {
  const res = await api.put<ApiResponse<OvertimeRequest>>(`/overtime/${id}/reject`, {
    reviewNote: reviewNote || undefined,
  });
  return res.data.data;
}

export async function cancelOvertimeRequest(id: string): Promise<OvertimeRequest> {
  const res = await api.put<ApiResponse<OvertimeRequest>>(`/overtime/${id}/cancel`, {});
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

export function employeeLabel(emp?: EmployeeRef | null): string {
  if (!emp) return '—';
  const name = emp.profile ? `${emp.profile.firstName} ${emp.profile.lastName}`.trim() : '';
  return name ? `${name} (${emp.employeeNo})` : emp.employeeNo;
}
