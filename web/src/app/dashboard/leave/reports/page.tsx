'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  employeeLabel,
  exportLeaveReport,
  fetchLeaveReport,
  fetchLeaveTypes,
  type LeaveRequest,
  type LeaveStatus,
  type ReportParams,
} from '@/features/leave/api';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { PRIVILEGED } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

const STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const ALL = 'ALL';
const CURRENT_YEAR = new Date().getFullYear();

type Row = LeaveRequest & Record<string, unknown>;

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

export default function LeaveReportsPage() {
  const router = useRouter();
  const { hasRole, loading } = useAuth();
  const allowed = hasRole(...PRIVILEGED);

  useEffect(() => {
    if (!loading && !allowed) router.replace('/dashboard/leave');
  }, [loading, allowed, router]);

  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [status, setStatus] = useState<string>(ALL);
  const [leaveTypeId, setLeaveTypeId] = useState<string>(ALL);

  const filters: ReportParams = {
    year,
    status: status === ALL ? undefined : (status as LeaveStatus),
    leaveTypeId: leaveTypeId === ALL ? undefined : leaveTypeId,
  };

  const typesQuery = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: fetchLeaveTypes,
    enabled: allowed,
  });

  const reportQuery = useQuery({
    queryKey: ['leave', 'report', year, status, leaveTypeId],
    queryFn: () => fetchLeaveReport(filters),
    enabled: allowed,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportLeaveReport(filters),
    onSuccess: () => toast.success('Report exported.'),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!allowed) return null;

  const report = reportQuery.data;
  const summary = report?.summary;
  const types = typesQuery.data ?? [];

  const columns: Column<Row>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => <span className="font-medium">{employeeLabel(r.employee)}</span>,
    },
    { key: 'leaveType', header: 'Leave Type', render: (r) => r.leaveType?.name ?? '—' },
    {
      key: 'dates',
      header: 'Dates',
      render: (r) => (
        <span>
          {formatDate(r.startDate)} – {formatDate(r.endDate)}
        </span>
      ),
    },
    { key: 'days', header: 'Days', align: 'right', render: (r) => num(r.days) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Leave Reports"
        description="Aggregate leave data and export to CSV."
        action={
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        }
      />

      <div className="grid animate-fade-up gap-4 rounded-xl border bg-card p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min={2000}
            max={3000}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || CURRENT_YEAR)}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Leave Type</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All leave types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reportQuery.isLoading || !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div
          className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: '60ms' }}
        >
          <StatCard label="Total Requests" value={summary.total} icon={FileSpreadsheet} />
          <StatCard label="Approved Days" value={summary.approvedDays} icon={Download} />
          <StatCard label="Pending" value={summary.byStatus.PENDING ?? 0} icon={FileSpreadsheet} />
          <StatCard label="Approved" value={summary.byStatus.APPROVED ?? 0} icon={FileSpreadsheet} />
        </div>
      )}

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <DataTable<Row>
          columns={columns}
          rows={(report?.requests ?? []) as Row[]}
          loading={reportQuery.isLoading}
          emptyTitle="No data"
          emptyDescription="No leave requests match the selected filters."
          getRowKey={(r) => r.id}
        />
      </div>
    </div>
  );
}
