'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import {
  APPROVAL_SUBJECT_TYPES,
  actOnApproval,
  fetchApprovalInbox,
  requesterName,
  type ApprovalDecision,
  type ApprovalInstance,
  type ApprovalSubjectType,
} from '@/features/approvals/api';
import { getApiErrorMessage } from '@/lib/api';
import { STAFF } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';

const ALL = 'ALL';

const SUBJECT_LABELS: Record<ApprovalSubjectType, string> = {
  ATTENDANCE_CORRECTION: 'Attendance',
  DTR_PERIOD: 'DTR Period',
  LEAVE_REQUEST: 'Leave',
  OVERTIME_REQUEST: 'Overtime',
  APPOINTMENT: 'Appointment',
  PROFILE_UPDATE_REQUEST: 'Profile',
};

const SUBJECT_FILTERS: ({ value: typeof ALL; label: string } | { value: ApprovalSubjectType; label: string })[] = [
  { value: ALL, label: 'All' },
  ...APPROVAL_SUBJECT_TYPES.map((value) => ({ value, label: SUBJECT_LABELS[value] })),
];

function stageLabel(stage: string): string {
  return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function pendingStepLabel(approval: ApprovalInstance): string {
  const pending = approval.steps.find(
    (step) => step.status === 'PENDING' && step.stage === approval.currentStage,
  );
  return stageLabel(pending?.stage ?? approval.currentStage);
}

function ApprovalActionDialog({
  approval,
  decision,
  disabled,
  onAct,
}: {
  approval: ApprovalInstance;
  decision: ApprovalDecision;
  disabled?: boolean;
  onAct: (input: { id: string; decision: ApprovalDecision; note?: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isReject = decision === 'REJECT';
  const noteValue = note.trim();
  const noteRequired = isReject && !noteValue;

  async function handleConfirm() {
    if (noteRequired) return;
    setSubmitting(true);
    try {
      await onAct({ id: approval.id, decision, note: noteValue || undefined });
      setOpen(false);
      setNote('');
    } catch {
      // Mutation caller owns the toast.
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setNote('');
  }

  return (
    <>
      <Button
        size="sm"
        variant={isReject ? 'destructive' : 'outline'}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {isReject ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        {isReject ? 'Reject' : 'Approve'}
      </Button>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={isReject ? 'Reject approval' : 'Approve approval'}
        description={`${SUBJECT_LABELS[approval.subjectType]} request from ${requesterName(approval)}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={isReject ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={submitting || noteRequired}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isReject ? 'Reject' : 'Approve'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor={`${approval.id}-${decision}`} className="text-sm font-medium">
            {isReject ? 'Reason' : 'Note (optional)'}
          </label>
          <Textarea
            id={`${approval.id}-${decision}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={isReject ? 'Why is this being rejected?' : 'Add an optional note...'}
            rows={4}
          />
          {noteRequired && <p className="text-xs font-medium text-destructive">A reason is required.</p>}
        </div>
      </Modal>
    </>
  );
}

export default function ApprovalsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasRole, loading } = useAuth();
  const allowed = hasRole(...STAFF);

  const [page, setPage] = useState(1);
  const [subjectType, setSubjectType] = useState<ApprovalSubjectType | typeof ALL>(ALL);

  useEffect(() => {
    if (!loading && !allowed) router.replace('/dashboard');
  }, [allowed, loading, router]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['approvals', 'inbox', { page, subjectType }],
    queryFn: () =>
      fetchApprovalInbox({
        page,
        limit: 10,
        sort: 'submittedAt',
        order: 'desc',
        subjectType: subjectType === ALL ? undefined : subjectType,
      }),
    enabled: allowed,
  });

  const action = useMutation({
    mutationFn: (input: { id: string; decision: ApprovalDecision; note?: string }) =>
      actOnApproval(input.id, { decision: input.decision, note: input.note }),
    onSuccess: (_approval, input) => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      toast.success(input.decision === 'APPROVE' ? 'Approval advanced.' : 'Approval rejected.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!allowed) return null;

  const columns: Column<ApprovalInstance>[] = [
    {
      key: 'requester',
      header: 'Requester',
      render: (approval) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{requesterName(approval)}</p>
          <p className="text-xs text-muted-foreground">{approval.requester?.employeeNo ?? '-'}</p>
        </div>
      ),
    },
    { key: 'module', header: 'Module', render: (approval) => SUBJECT_LABELS[approval.subjectType] },
    { key: 'stage', header: 'Stage', render: (approval) => pendingStepLabel(approval) },
    { key: 'status', header: 'Status', render: (approval) => <StatusBadge status={approval.status} /> },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (approval) => <span className="whitespace-nowrap">{formatDateTime(approval.submittedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (approval) => (
        <div className="flex justify-end gap-2">
          <ApprovalActionDialog
            approval={approval}
            decision="APPROVE"
            disabled={action.isPending}
            onAct={(input) => action.mutateAsync(input)}
          />
          <ApprovalActionDialog
            approval={approval}
            decision="REJECT"
            disabled={action.isPending}
            onAct={(input) => action.mutateAsync(input)}
          />
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="flex w-full flex-wrap gap-2">
      {SUBJECT_FILTERS.map((filter) => {
        const active = subjectType === filter.value;
        return (
          <Button
            key={filter.value}
            type="button"
            variant={active ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSubjectType(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Approvals"
        description="Review workflow items assigned to you."
      />

      <DataTable<ApprovalInstance>
        columns={columns}
        rows={data?.items ?? []}
        loading={isLoading || isFetching}
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={toolbar}
        emptyTitle="No approvals"
        emptyDescription="Workflow items awaiting your action will appear here."
      />
    </div>
  );
}
