'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Loader2, ShieldX } from 'lucide-react';
import {
  fetchReport,
  exportReportCsv,
  type AttendanceReportRow,
  type ReportParams,
} from '@/features/attendance/api';
import { formatMinutes, MONTHS } from '@/features/attendance/utils';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const columns: Column<AttendanceReportRow>[] = [
  { key: 'employeeNo', header: 'Emp No' },
  { key: 'name', header: 'Name' },
  { key: 'presentDays', header: 'Present', align: 'right' },
  { key: 'lateDays', header: 'Late', align: 'right' },
  { key: 'absentDays', header: 'Absent', align: 'right' },
  { key: 'onLeaveDays', header: 'On Leave', align: 'right' },
  { key: 'halfDays', header: 'Half Day', align: 'right' },
  { key: 'holidayDays', header: 'Holiday', align: 'right' },
  { key: 'totalLateMinutes', header: 'Late', align: 'right', render: (r) => formatMinutes(r.totalLateMinutes) },
  { key: 'totalUndertimeMinutes', header: 'Undertime', align: 'right', render: (r) => formatMinutes(r.totalUndertimeMinutes) },
  { key: 'totalWorkedMinutes', header: 'Worked', align: 'right', render: (r) => formatMinutes(r.totalWorkedMinutes) },
];

export default function AttendanceReportsPage() {
  const { hasRole } = useAuth();
  const privileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const params: ReportParams = { year, month };

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'reports', params],
    queryFn: () => fetchReport(params),
    enabled: privileged,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportReportCsv(params),
    onSuccess: () => toast.success('Report exported'),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!privileged) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance Reports" />
        <EmptyState
          icon={ShieldX}
          title="Access denied"
          description="You do not have permission to view attendance reports."
        />
      </div>
    );
  }

  const rows = data ?? [];

  const toolbar = (
    <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <Label>Month</Label>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Year</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Reports"
        description="Aggregated attendance totals per employee."
        action={
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || !rows.length}>
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        getRowKey={(r) => r.employeeId}
        toolbar={toolbar}
        emptyTitle="No report data"
        emptyDescription="No attendance was recorded for the selected period."
      />
    </div>
  );
}
