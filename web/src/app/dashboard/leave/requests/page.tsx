'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import {
  approveLeaveRequest,
  employeeLabel,
  fetchLeaveRequests,
  fetchLeaveTypes,
  rejectLeaveRequest,
  type LeaveRequest,
  type LeaveStatus,
} from '@/features/leave/api';
import { ReviewDialog } from '@/features/leave/components/ReviewDialog';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { PRIVILEGED } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';

const STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const ALL = 'ALL';

type Row = LeaveRequest & Record<string, unknown>;

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

export default function LeaveRequestsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasRole, loading } = useAuth();
  const allowed = hasRole(...PRIVILEGED);

  useEffect(() => {
    if (!loading && !allowed) router.replace('/dashboard/leave');
  }, [loading, allowed, router]);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('PENDING');
  const [leaveTypeId, setLeaveTypeId] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const typesQuery = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: fetchLeaveTypes,
    enabled: allowed,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leave', 'requests', 'all', page, status, leaveTypeId, debouncedSearch],
    queryFn: () =>
      fetchLeaveRequests({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : (status as LeaveStatus),
        leaveTypeId: leaveTypeId === ALL ? undefined : leaveTypeId,
      }),
    enabled: allowed,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => approveLeaveRequest(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave request approved.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectLeaveRequest(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave request rejected.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!allowed) return null;

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
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => {
        if (r.status !== 'PENDING') return null;
        return (
          <div className="flex justify-end gap-2">
            <ReviewDialog
              mode="approve"
              title="Approve leave request?"
              description={`${employeeLabel(r.employee)} · ${r.leaveType?.name ?? ''} · ${num(
                r.days,
              )} day(s)`}
              onSubmit={async (note) => {
                await approveMutation.mutateAsync({ id: r.id, note });
              }}
              trigger={
                <Button variant="outline" size="sm">
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              }
            />
            <ReviewDialog
              mode="reject"
              title="Reject leave request?"
              description={`${employeeLabel(r.employee)} · ${r.leaveType?.name ?? ''}`}
              onSubmit={async (note) => {
                await rejectMutation.mutateAsync({ id: r.id, note });
              }}
              trigger={
                <Button variant="destructive" size="sm">
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              }
            />
          </div>
        );
      },
    },
  ];

  const types = typesQuery.data ?? [];

  const toolbar = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Search…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="sm:max-w-xs"
      />
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="sm:w-44">
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
      <Select
        value={leaveTypeId}
        onValueChange={(v) => {
          setLeaveTypeId(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="sm:w-52">
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
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Leave Requests" description="Review and approve employee leave requests." />

      <div className="animate-fade-up">
        <DataTable<Row>
          columns={columns}
          rows={(data?.items ?? []) as Row[]}
          loading={isLoading || isFetching}
          meta={data?.meta}
          onPageChange={setPage}
          toolbar={toolbar}
          emptyTitle="No leave requests"
          emptyDescription="No requests match the current filters."
        />
      </div>
    </div>
  );
}
