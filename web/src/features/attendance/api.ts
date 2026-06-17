import axios from 'axios';
import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta } from '@/types';

// ─────────────────────────────────────────────────────────────
// Domain types (mirror the API responses)
// ─────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'HALF_DAY'
  | 'HOLIDAY';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface EmployeeMini {
  id: string;
  employeeNo: string;
  profile: { firstName: string; lastName: string } | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  breakIn: string | null;
  breakOut: string | null;
  lateMinutes: number;
  undertimeMinutes: number;
  workedMinutes: number;
  status: AttendanceStatus;
  remarks: string | null;
  workSummary: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present only on privileged log lists. */
  employee?: EmployeeMini;
  /** Allow use as a <DataTable> row. */
  [key: string]: unknown;
}

export interface MonthlyDtrDay {
  date: string;
  day: number;
  attendance: AttendanceRecord | null;
  /** Computed reason a day has no attendance record (server-derived). */
  derivedStatus?: 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'REST_DAY' | null;
  [key: string]: unknown;
}

export interface MonthlyDtr {
  employeeId: string;
  year: number;
  month: number;
  days: MonthlyDtrDay[];
}

export interface AttendancePeriodReadiness {
  year?: number;
  month?: number;
  status?: string | null;
  ready?: boolean;
  isReady?: boolean;
  certified?: boolean;
  dtrCertified?: boolean;
  certifiedAt?: string | null;
  totalEmployees?: number;
  readyEmployees?: number;
  incompleteDtr?: number;
  missingDtr?: number;
  conflicts?: number;
  failed?: number;
  queued?: number;
  counts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AttendanceCorrection {
  id: string;
  attendanceId: string | null;
  employeeId: string;
  date: string;
  requestedTimeIn: string | null;
  requestedTimeOut: string | null;
  requestedBreakIn: string | null;
  requestedBreakOut: string | null;
  reason: string;
  status: RequestStatus;
  reviewedById: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeMini;
  [key: string]: unknown;
}

export interface AttendanceReportRow {
  employeeId: string;
  employeeNo: string;
  name: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  onLeaveDays: number;
  halfDays: number;
  holidayDays: number;
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  totalWorkedMinutes: number;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Query params
// ─────────────────────────────────────────────────────────────

export interface HistoryParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  employeeId?: string;
}

export interface CorrectionListParams {
  page?: number;
  limit?: number;
  status?: RequestStatus;
  employeeId?: string;
}

export interface ReportParams {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
  employeeId?: string;
  departmentId?: string;
}

export interface CreateCorrectionPayload {
  date: string;
  requestedTimeIn?: string;
  requestedTimeOut?: string;
  requestedBreakIn?: string;
  requestedBreakOut?: string;
  reason: string;
}

type PunchAction = 'time-in' | 'time-out' | 'break-in' | 'break-out';

// ─────────────────────────────────────────────────────────────
// Punches
// ─────────────────────────────────────────────────────────────

export async function punch(
  action: PunchAction,
  body?: { workSummary?: string },
): Promise<AttendanceRecord> {
  const res = await api.post<ApiResponse<AttendanceRecord>>(`/attendance/${action}`, body);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Self reads
// ─────────────────────────────────────────────────────────────

export async function fetchHistory(params: HistoryParams): Promise<Paginated<AttendanceRecord>> {
  const res = await api.get<ApiResponse<AttendanceRecord[]>>('/attendance/history', { params });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function fetchMonthlyDtr(year: number, month: number): Promise<MonthlyDtr> {
  const res = await api.get<ApiResponse<MonthlyDtr>>('/attendance/monthly-dtr', {
    params: { year, month },
  });
  return res.data.data;
}

export async function fetchAttendancePeriodReadiness(
  year: number,
  month: number,
): Promise<AttendancePeriodReadiness | null> {
  try {
    const res = await api.get<ApiResponse<AttendancePeriodReadiness>>('/attendance/periods/readiness', {
      params: { year, month },
    });
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Corrections
// ─────────────────────────────────────────────────────────────

export async function createCorrection(
  payload: CreateCorrectionPayload,
): Promise<AttendanceCorrection> {
  const res = await api.post<ApiResponse<AttendanceCorrection>>('/attendance/corrections', payload);
  return res.data.data;
}

export async function fetchCorrections(
  params: CorrectionListParams,
): Promise<Paginated<AttendanceCorrection>> {
  const res = await api.get<ApiResponse<AttendanceCorrection[]>>('/attendance/corrections', {
    params,
  });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function approveCorrection(
  id: string,
  reviewNote?: string,
): Promise<void> {
  await api.put(`/attendance/corrections/${id}/approve`, { reviewNote });
}

export async function rejectCorrection(id: string, reviewNote?: string): Promise<void> {
  await api.put(`/attendance/corrections/${id}/reject`, { reviewNote });
}

// ─────────────────────────────────────────────────────────────
// Reports (privileged)
// ─────────────────────────────────────────────────────────────

export async function fetchReport(params: ReportParams): Promise<AttendanceReportRow[]> {
  const res = await api.get<ApiResponse<AttendanceReportRow[]>>('/attendance/reports', { params });
  return res.data.data;
}

/** Download the CSV export as a blob and trigger a browser save. */
export async function exportReportCsv(params: ReportParams): Promise<void> {
  const res = await api.get('/attendance/reports/export', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([res.data as BlobPart], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'attendance-report.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Team activity feed
// ─────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: 'IN' | 'OUT';
  time: string;
  date: string;
  summary: string | null;
  employee: { id: string; name: string; photoUrl: string | null };
}

export async function fetchActivity(limit = 20): Promise<ActivityItem[]> {
  const res = await api.get<ApiResponse<ActivityItem[]>>('/attendance/activity', {
    params: { limit },
  });
  return res.data.data;
}
