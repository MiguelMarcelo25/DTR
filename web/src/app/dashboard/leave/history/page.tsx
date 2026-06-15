'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  cancelLeaveRequest,
  fetchLeaveRequests,
  type LeaveRequest,
  type LeaveStatus,
} from '@/features/leave/api';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

const STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const ALL = 'ALL';

type Row = LeaveRequest & Record<string, unknown>;

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

export default function LeaveHistoryPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>(ALL);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leave', 'requests', 'mine', 'history', page, status],
    queryFn: () =>
      fetchLeaveRequests({
        page,
        limit: 10,
        status: status === ALL ? undefined : (status as LeaveStatus),
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave request cancelled.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const columns: Column<Row>[] = [
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (r) => <span className="font-medium">{r.leaveType?.name ?? '—'}</span>,
    },
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
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="line-clamp-1 max-w-[16rem] text-muted-foreground">{r.reason ?? '—'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => {
        const cancellable = r.status === 'PENDING' || r.status === 'APPROVED';
        if (!cancellable) return null;
        return (
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            }
            title="Cancel leave request?"
            description="This will withdraw the request. Approved leave will have its balance restored."
            confirmLabel="Cancel request"
            destructive
            onConfirm={async () => {
              await cancelMutation.mutateAsync(r.id);
            }}
          />
        );
      },
    },
  ];

  const toolbar = (
    <Select
      value={status}
      onValueChange={(v) => {
        setStatus(v);
        setPage(1);
      }}
    >
      <SelectTrigger className="w-44">
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
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Leave History"
        description="All your leave requests."
        action={
          <Button asChild>
            <Link href="/dashboard/leave/request">
              <Plus className="h-4 w-4" />
              Request Leave
            </Link>
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Row>
          columns={columns}
          rows={(data?.items ?? []) as Row[]}
          loading={isLoading || isFetching}
          meta={data?.meta}
          onPageChange={setPage}
          toolbar={toolbar}
          emptyTitle="No leave requests"
          emptyDescription="You haven't submitted any leave requests yet."
        />
      </div>
    </div>
  );
}
