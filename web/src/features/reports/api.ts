import { api } from '@/lib/api';
import type { ApiResponse, PaginationMeta } from '@/types';

// ─────────────────────────────────────────────────────────────
// Types (mirror x:/tina/api/src/services/report.service.ts)
// ─────────────────────────────────────────────────────────────

export type ReportType =
  | 'attendance'
  | 'dtr'
  | 'late'
  | 'undertime'
  | 'absences'
  | 'leave'
  | 'appointments'
  | 'payroll'
  | 'employees'
  | 'employee-background';

export type ExportFormat = 'csv' | 'pdf';

export interface ReportColumn {
  key: string;
  label: string;
}

/** A single report row — string-keyed map of cell values. */
export type ReportRow = Record<string, unknown>;

/** Summary is report-specific; values may be primitives or nested objects. */
export type ReportSummary = Record<string, unknown>;

export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportSummary;
  meta: PaginationMeta;
}

/** Filters accepted by every report endpoint + the exporter. */
export interface ReportFilters {
  from?: string;
  to?: string;
  departmentId?: string;
  employeeId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Strip empty/undefined values so we never send blank query params. */
function cleanParams(filters: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Report fetchers
// ─────────────────────────────────────────────────────────────

/** Fetch a single JSON report (paginated rows + summary + meta). */
export async function fetchReport(type: ReportType, filters: ReportFilters): Promise<ReportResult> {
  const res = await api.get<ApiResponse<ReportResult>>(`/reports/${type}`, {
    params: cleanParams({ ...filters }),
  });
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Export (CSV / PDF) — downloads a binary file in the browser
// ─────────────────────────────────────────────────────────────

/** Parse the filename from a Content-Disposition header, with a fallback. */
function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

/** Save a Blob to disk by creating a temporary object URL + anchor click. */
function saveBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Stream a report export and trigger a browser download. The backend sets the
 * Content-Disposition filename (e.g. `attendance-report-2026-06-15.csv`).
 */
export async function exportReport(
  type: ReportType,
  format: ExportFormat,
  filters: ReportFilters,
): Promise<void> {
  const res = await api.get(`/reports/export`, {
    params: cleanParams({
      type,
      format,
      from: filters.from,
      to: filters.to,
      departmentId: filters.departmentId,
      employeeId: filters.employeeId,
      search: filters.search,
      sort: filters.sort,
      order: filters.order,
    }),
    responseType: 'blob',
  });

  const blob = res.data as Blob;
  const fallback = `${type}-report.${format}`;
  const filename = filenameFromDisposition(
    res.headers?.['content-disposition'] as string | undefined,
    fallback,
  );
  saveBlob(blob, filename);
}

// ─────────────────────────────────────────────────────────────
// Filter option sources (employees + derived departments)
// ─────────────────────────────────────────────────────────────

export interface FilterOption {
  id: string;
  label: string;
}

interface EmployeeListItem {
  id: string;
  employeeNo: string;
  departmentId: string | null;
  department: { name: string } | null;
  profile: { firstName: string | null; lastName: string | null } | null;
}

/**
 * Load employee + department options for the report filters. Departments are
 * derived (deduped) from the employee list because the API exposes no standalone
 * departments endpoint. We pull a generous page so the dropdowns are complete.
 */
export async function fetchFilterOptions(): Promise<{
  employees: FilterOption[];
  departments: FilterOption[];
}> {
  const res = await api.get<ApiResponse<EmployeeListItem[]>>('/employees', {
    params: { limit: 200, sort: 'employeeNo', order: 'asc' },
  });
  const items = res.data.data ?? [];

  const employees: FilterOption[] = items.map((e) => {
    const name = [e.profile?.lastName, e.profile?.firstName].filter(Boolean).join(', ');
    return { id: e.id, label: name ? `${name} (${e.employeeNo})` : e.employeeNo };
  });

  const deptMap = new Map<string, string>();
  for (const e of items) {
    if (e.departmentId && e.department?.name && !deptMap.has(e.departmentId)) {
      deptMap.set(e.departmentId, e.department.name);
    }
  }
  const departments: FilterOption[] = Array.from(deptMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { employees, departments };
}
