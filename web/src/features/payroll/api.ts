import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta } from '@/types';

// ─────────────────────────────────────────────────────────────
// Shared enums / shapes (mirror the backend service responses)
// ─────────────────────────────────────────────────────────────

export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'RELEASED' | 'CANCELLED';
export type PayrollItemType = 'EARNING' | 'DEDUCTION';

export type PayrollPeriodListItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string | null;
  status: PayrollStatus;
  payrollCount: number;
  createdAt: string;
  updatedAt: string;
};

export interface PayrollItem {
  type: PayrollItemType;
  code: string;
  label: string;
  amount: number;
}

export type EmployeePayroll = {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  status: PayrollStatus;
  daysWorked: number;
  lateMinutes: number;
  undertimeMinutes: number;
  absentDays: number;
  overtimeHours: number;
  basicPay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  items: PayrollItem[];
  payslip: { id: string; payslipNo: string; releasedAt: string | null } | null;
};

export interface PayrollPeriodDetail {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string | null;
  status: PayrollStatus;
  createdAt: string;
  updatedAt: string;
  payrolls: EmployeePayroll[];
}

export type PayslipListItem = {
  id: string;
  payslipNo: string;
  payrollId: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  grossPay: number;
  netPay: number;
  generatedAt: string;
  releasedAt: string | null;
};

export interface PayrollReport {
  totals: {
    payrollCount: number;
    basicPay: number;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
  byPeriod: {
    periodId: string;
    periodName: string | null;
    startDate: string | null;
    endDate: string | null;
    status: PayrollStatus | null;
    payrollCount: number;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  }[];
}

export interface ProcessPayrollPayload {
  name: string;
  startDate: string;
  endDate: string;
  payDate?: string;
}

export interface ProcessPayrollResult {
  period: PayrollPeriodListItem | Record<string, unknown>;
  processed: number;
}

// ─────────────────────────────────────────────────────────────
// Query param shapes
// ─────────────────────────────────────────────────────────────

export interface ListPeriodsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PayrollStatus;
}

export interface ListPayslipsParams {
  page?: number;
  limit?: number;
  search?: string;
  periodId?: string;
}

export interface ReportFilters {
  status?: PayrollStatus;
  periodId?: string;
  startDate?: string;
  endDate?: string;
}

// ─────────────────────────────────────────────────────────────
// Payroll periods (privileged)
// ─────────────────────────────────────────────────────────────

export async function listPeriods(params: ListPeriodsParams): Promise<Paginated<PayrollPeriodListItem>> {
  const res = await api.get<ApiResponse<PayrollPeriodListItem[]>>('/payroll', { params });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function getPeriod(id: string): Promise<PayrollPeriodDetail> {
  const res = await api.get<ApiResponse<PayrollPeriodDetail>>(`/payroll/${id}`);
  return res.data.data;
}

export async function processPayroll(payload: ProcessPayrollPayload): Promise<ProcessPayrollResult> {
  const res = await api.post<ApiResponse<ProcessPayrollResult>>('/payroll/process', payload);
  return res.data.data;
}

export async function recalculatePeriod(id: string): Promise<void> {
  await api.put(`/payroll/${id}/recalculate`);
}

export async function releasePeriod(id: string): Promise<void> {
  await api.put(`/payroll/${id}/release`);
}

export async function cancelPeriod(id: string): Promise<void> {
  await api.put(`/payroll/${id}/cancel`);
}

// ─────────────────────────────────────────────────────────────
// Reports (privileged)
// ─────────────────────────────────────────────────────────────

export async function getReports(filters: ReportFilters): Promise<PayrollReport> {
  const res = await api.get<ApiResponse<PayrollReport>>('/payroll/reports', { params: filters });
  return res.data.data;
}

/** Export payroll report as CSV (returns a Blob to trigger a download). */
export async function exportReports(filters: ReportFilters): Promise<Blob> {
  const res = await api.get('/payroll/reports/export', {
    params: filters,
    responseType: 'blob',
  });
  return res.data as Blob;
}

// ─────────────────────────────────────────────────────────────
// Payslips (self / privileged)
// ─────────────────────────────────────────────────────────────

export async function listPayslips(params: ListPayslipsParams): Promise<Paginated<PayslipListItem>> {
  const res = await api.get<ApiResponse<PayslipListItem[]>>('/payslips', { params });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

/** Download a payslip PDF as a Blob (open or save on the client). */
export async function downloadPayslip(id: string): Promise<Blob> {
  const res = await api.get(`/payslips/${id}/download`, { responseType: 'blob' });
  return res.data as Blob;
}

/** Open a Blob in a new browser tab, revoking the object URL afterwards. */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  // Give the new tab time to read the URL before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Trigger a file download for a Blob in the browser. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
