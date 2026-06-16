'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, X } from 'lucide-react';
import {
  approveOvertimeRequest,
  cancelOvertimeRequest,
  createOvertimeRequest,
  employeeLabel,
  fetchOvertimeRequests,
  rejectOvertimeRequest,
  type OvertimeRequest,
  type OvertimeStatus,
} from '@/features/overtime/api';
import {
  overtimeRequestSchema,
  rejectOvertimeSchema,
  type OvertimeRequestValues,
  type RejectOvertimeValues,
} from '@/schemas/overtime.schema';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { PRIVILEGED } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, DateField, NumberField, TextareaField } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

const STATUSES: OvertimeStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const ALL = 'ALL';

type Row = OvertimeRequest & Record<string, unknown>;

function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function OvertimePage() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const privileged = hasRole(...PRIVILEGED);
  const myEmployeeId = user?.employeeId ?? undefined;

  const [submitOpen, setSubmitOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<OvertimeRequest | null>(null);

  // ── My requests ──
  const [minePage, setMinePage] = useState(1);
  const mineQuery = useQuery({
    queryKey: ['overtime', 'mine', myEmployeeId, minePage],
    queryFn: () =>
      fetchOvertimeRequests({ page: minePage, limit: 10, employeeId: myEmployeeId }),
    enabled: !!myEmployeeId,
  });

  // ── All requests (privileged) ──
  const [allPage, setAllPage] = useState(1);
  const [status, setStatus] = useState<string>('PENDING');
  const allQuery = useQuery({
    queryKey: ['overtime', 'all', allPage, status],
    queryFn: () =>
      fetchOvertimeRequests({
        page: allPage,
        limit: 10,
        status: status === ALL ? undefined : (status as OvertimeStatus),
      }),
    enabled: privileged,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createOvertimeRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Overtime request submitted.');
      setSubmitOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOvertimeRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Overtime request cancelled.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveOvertimeRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Overtime request approved.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      rejectOvertimeRequest(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Overtime request rejected.');
      setRejectTarget(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // ── Forms ──
  const submitForm = useForm<OvertimeRequestValues>({
    resolver: zodResolver(overtimeRequestSchema),
    defaultValues: { date: '', hours: undefined, reason: '' },
  });

  const rejectForm = useForm<RejectOvertimeValues>({
    resolver: zodResolver(rejectOvertimeSchema),
    defaultValues: { reviewNote: '' },
  });

  function openSubmit() {
    submitForm.reset({ date: '', hours: undefined, reason: '' });
    setSubmitOpen(true);
  }

  async function handleSubmit(values: OvertimeRequestValues) {
    await createMutation.mutateAsync({
      date: values.date,
      hours: values.hours,
      reason: values.reason?.trim() || undefined,
    });
  }

  function openReject(r: OvertimeRequest) {
    rejectForm.reset({ reviewNote: '' });
    setRejectTarget(r);
  }

  async function handleReject(values: RejectOvertimeValues) {
    if (!rejectTarget) return;
    await rejectMutation.mutateAsync({
      id: rejectTarget.id,
      reviewNote: values.reviewNote?.trim() || undefined,
    });
  }

  // ── Columns ──
  const mineColumns: Column<Row>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'hours', header: 'Hours', align: 'right', render: (r) => Number(r.hours) },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="block max-w-xs truncate text-muted-foreground">{r.reason || '—'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => {
        if (r.status !== 'PENDING') return null;
        return (
          <ConfirmDialog
            destructive
            title="Cancel overtime request?"
            description={`${formatDate(r.date)} · ${Number(r.hours)} hour(s). This cannot be undone.`}
            confirmLabel="Cancel request"
            onConfirm={() => cancelMutation.mutateAsync(r.id)}
            trigger={
              <Button variant="outline" size="sm">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            }
          />
        );
      },
    },
  ];

  const allColumns: Column<Row>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => <span className="font-medium">{employeeLabel(r.employee)}</span>,
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'hours', header: 'Hours', align: 'right', render: (r) => Number(r.hours) },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="block max-w-xs truncate text-muted-foreground">{r.reason || '—'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => {
        if (r.status !== 'PENDING') return null;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(r.id)}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button variant="destructive" size="sm" onClick={() => openReject(r)}>
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const allToolbar = (
    <Select
      value={status}
      onValueChange={(v) => {
        setStatus(v);
        setAllPage(1);
      }}
    >
      <SelectTrigger className="sm:w-44">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {statusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const submitting = createMutation.isPending;
  const rejecting = rejectMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Overtime"
        description="Submit overtime requests and track their status."
        action={
          myEmployeeId ? (
            <Button onClick={openSubmit}>
              <Plus className="h-4 w-4" />
              Request Overtime
            </Button>
          ) : undefined
        }
      />

      {/* My requests */}
      {myEmployeeId && (
        <section className="animate-fade-up space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            My Requests
          </h2>
          <DataTable<Row>
            columns={mineColumns}
            rows={(mineQuery.data?.items ?? []) as Row[]}
            loading={mineQuery.isLoading || mineQuery.isFetching}
            meta={mineQuery.data?.meta}
            onPageChange={setMinePage}
            emptyTitle="No overtime requests"
            emptyDescription="Submit a request to get started."
          />
        </section>
      )}

      {/* All requests (privileged) */}
      {privileged && (
        <section
          className="animate-fade-up space-y-3"
          style={{ animationDelay: '60ms' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            All Requests
          </h2>
          <DataTable<Row>
            columns={allColumns}
            rows={(allQuery.data?.items ?? []) as Row[]}
            loading={allQuery.isLoading || allQuery.isFetching}
            meta={allQuery.data?.meta}
            onPageChange={setAllPage}
            toolbar={allToolbar}
            emptyTitle="No overtime requests"
            emptyDescription="No requests match the current filter."
          />
        </section>
      )}

      {/* Submit modal */}
      <Modal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Request Overtime"
        description="Log overtime hours for approval by HR."
        footer={
          <>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="overtime-form" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </>
        }
      >
        <Form id="overtime-form" form={submitForm} onSubmit={handleSubmit}>
          <DateField name="date" label="Date" required />
          <NumberField
            name="hours"
            label="Hours"
            required
            min={0.5}
            max={24}
            step={0.5}
            placeholder="e.g. 2"
          />
          <TextareaField
            name="reason"
            label="Reason"
            placeholder="What was the overtime for?"
            rows={3}
          />
        </Form>
      </Modal>

      {/* Reject note modal */}
      <Modal
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) setRejectTarget(null);
        }}
        title="Reject overtime request?"
        description={
          rejectTarget
            ? `${employeeLabel(rejectTarget.employee)} · ${formatDate(rejectTarget.date)} · ${Number(
                rejectTarget.hours,
              )} hour(s)`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="overtime-reject-form"
              variant="destructive"
              disabled={rejecting}
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </>
        }
      >
        <Form id="overtime-reject-form" form={rejectForm} onSubmit={handleReject}>
          <TextareaField
            name="reviewNote"
            label="Note (optional)"
            placeholder="Add an optional note for the employee…"
            rows={4}
          />
        </Form>
      </Modal>
    </div>
  );
}
