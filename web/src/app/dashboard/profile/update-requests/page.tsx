'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Plus } from 'lucide-react';
import {
  cancelUpdateRequest,
  fetchUpdateRequests,
  type ProfileUpdateRequest,
} from '@/features/profile/api';
import { REQUEST_STATUS_VALUES } from '@/schemas/profile.schema';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 10;
const ALL = 'ALL';

const humanizeSection = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function UpdateRequestsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>(ALL);
  const [viewing, setViewing] = useState<ProfileUpdateRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profile-update-requests', page, status],
    queryFn: () =>
      fetchUpdateRequests({
        page,
        limit: PAGE_SIZE,
        status: status === ALL ? undefined : status,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelUpdateRequest(id),
    onSuccess: () => {
      toast.success('Request cancelled.');
      qc.invalidateQueries({ queryKey: ['profile-update-requests'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not cancel request')),
  });

  const columns: Column<ProfileUpdateRequest & Record<string, unknown>>[] = [
    { key: 'section', header: 'Section', render: (r) => humanizeSection(r.section) },
    {
      key: 'fields',
      header: 'Fields',
      align: 'right',
      render: (r) => Object.keys(r.changes ?? {}).length,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: 'Submitted', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'reviewedAt',
      header: 'Reviewed',
      render: (r) => (r.reviewedAt ? formatDateTime(r.reviewedAt) : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div
          className="flex justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
            <Eye className="h-4 w-4" />
            View
          </Button>
          {r.status === 'PENDING' && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
              }
              title="Cancel this request?"
              description="The pending update request will be withdrawn. This cannot be undone."
              confirmLabel="Cancel request"
              destructive
              onConfirm={async () => {
                await cancelMutation.mutateAsync(r.id);
              }}
            />
          )}
        </div>
      ),
    },
  ];

  const statusFilter = (
    <Select
      value={status}
      onValueChange={(v) => {
        setStatus(v);
        setPage(1);
      }}
    >
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {REQUEST_STATUS_VALUES.map((s) => (
          <SelectItem key={s} value={s}>
            {humanizeSection(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Update Requests"
        description="Track the status of your profile change requests."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/profile">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/profile/edit">
                <Plus className="h-4 w-4" />
                New request
              </Link>
            </Button>
          </>
        }
      />

      <div className="animate-fade-up">
        <DataTable
          columns={columns}
          rows={(data?.items ?? []) as (ProfileUpdateRequest & Record<string, unknown>)[]}
          loading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          toolbar={statusFilter}
          onRowClick={(r) => setViewing(r)}
          emptyTitle="No update requests"
          emptyDescription="You have not submitted any profile update requests yet."
        />
      </div>

      <RequestDetailModal request={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function RequestDetailModal({
  request,
  onClose,
}: {
  request: ProfileUpdateRequest | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!request}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="flex items-center gap-2">
          Request details
          {request && <StatusBadge status={request.status} />}
        </span>
      }
    >
      {request && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Section</span>
            <span className="font-medium">{humanizeSection(request.section)}</span>
            <span className="text-muted-foreground">Submitted</span>
            <span className="font-medium">{formatDateTime(request.createdAt)}</span>
            {request.reviewedAt && (
              <>
                <span className="text-muted-foreground">Reviewed</span>
                <span className="font-medium">{formatDateTime(request.reviewedAt)}</span>
              </>
            )}
          </div>

          <div>
            <p className="mb-2 font-medium">Requested changes</p>
            <div className="rounded-lg border">
              {Object.entries(request.changes ?? {}).map(([key, value]) => {
                const display =
                  value !== null && typeof value === 'object' && 'new' in (value as object)
                    ? String((value as { new: unknown }).new)
                    : String(value);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 border-b px-3 py-2 last:border-0"
                  >
                    <span className="text-muted-foreground">{humanizeSection(key)}</span>
                    <span className="break-all text-right font-medium">{display}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {request.reviewNote && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="mb-1 font-medium text-destructive">Review note</p>
              <p>{request.reviewNote}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
