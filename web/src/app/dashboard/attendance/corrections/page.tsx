'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCorrections,
  type AttendanceCorrection,
  type RequestStatus,
} from '@/features/attendance/api';
import { formatTime } from '@/features/attendance/utils';
import { CorrectionForm } from '@/features/attendance/components/CorrectionForm';
import { ReviewCorrectionDialog } from '@/features/attendance/components/ReviewCorrectionDialog';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

const STATUSES: RequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const ALL = 'ALL';

function employeeName(c: AttendanceCorrection): string {
  if (!c.employee) return '—';
  const p = c.employee.profile;
  return p ? `${p.firstName} ${p.lastName}`.trim() : c.employee.employeeNo;
}

export default function CorrectionsPage() {
  const { hasRole } = useAuth();
  const privileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>(ALL);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'corrections', { page, status, privileged }],
    queryFn: () =>
      fetchCorrections({
        page,
        limit: 20,
        status: status === ALL ? undefined : (status as RequestStatus),
      }),
  });

  const columns: Column<AttendanceCorrection>[] = [
    { key: 'date', header: 'Date', render: (c) => formatDate(c.date) },
    ...(privileged
      ? [{ key: 'employee', header: 'Employee', render: (c: AttendanceCorrection) => employeeName(c) }]
      : []),
    {
      key: 'requested',
      header: 'Requested',
      render: (c: AttendanceCorrection) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatTime(c.requestedTimeIn)} – {formatTime(c.requestedTimeOut)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (c: AttendanceCorrection) => (
        <span className="line-clamp-1 max-w-xs" title={c.reason}>
          {c.reason}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (c: AttendanceCorrection) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c: AttendanceCorrection) =>
        privileged && c.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <ReviewCorrectionDialog id={c.id} mode="approve" />
            <ReviewCorrectionDialog id={c.id} mode="reject" />
          </div>
        ) : c.reviewNote ? (
          <span className="text-xs text-muted-foreground" title={c.reviewNote}>
            Note added
          </span>
        ) : null,
    },
  ];

  const rows = data?.items ?? [];

  const toolbar = (
    <div className="flex flex-col items-start gap-1.5">
      <Label>Status</Label>
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Corrections"
        description={
          privileged
            ? 'Review correction requests and submit your own.'
            : 'Submit and track your attendance correction requests.'
        }
        action={<CorrectionForm />}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={toolbar}
        emptyTitle="No correction requests"
        emptyDescription={
          privileged
            ? 'No correction requests match the selected filter.'
            : 'You have not submitted any correction requests yet.'
        }
      />
    </div>
  );
}
