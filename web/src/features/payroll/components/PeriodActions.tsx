'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, Send, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import {
  recalculatePeriod,
  releasePeriod,
  cancelPeriod,
  type PayrollStatus,
} from '@/features/payroll/api';

/**
 * Inline action buttons for a payroll period. Available actions depend on
 * status (released/cancelled periods are terminal). Invalidates the supplied
 * query keys on success so lists and detail views refresh.
 */
export function PeriodActions({
  id,
  status,
  invalidateKeys = [['payroll', 'periods']],
}: {
  id: string;
  status: PayrollStatus;
  invalidateKeys?: unknown[][];
}) {
  const qc = useQueryClient();

  const invalidate = () => {
    invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
  };

  const recalc = useMutation({
    mutationFn: () => recalculatePeriod(id),
    onSuccess: () => {
      toast.success('Payroll recalculated');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const release = useMutation({
    mutationFn: () => releasePeriod(id),
    onSuccess: () => {
      toast.success('Payroll released');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: () => cancelPeriod(id),
    onSuccess: () => {
      toast.success('Payroll cancelled');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const isTerminal = status === 'RELEASED' || status === 'CANCELLED';
  const busy = recalc.isPending || release.isPending || cancel.isPending;

  if (isTerminal) {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => recalc.mutate()}
      >
        {recalc.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Calculator className="h-4 w-4" />
        )}
        Recalculate
      </Button>

      <ConfirmDialog
        title="Release payroll?"
        description="Payslips will be made available to employees and the period locked. This cannot be undone."
        confirmLabel="Release"
        onConfirm={async () => {
          await release.mutateAsync();
        }}
        trigger={
          <Button size="sm" disabled={busy}>
            <Send className="h-4 w-4" />
            Release
          </Button>
        }
      />

      <ConfirmDialog
        title="Cancel payroll?"
        description="This cancels the period and all of its payrolls. This cannot be undone."
        confirmLabel="Cancel period"
        destructive
        onConfirm={async () => {
          await cancel.mutateAsync();
        }}
        trigger={
          <Button variant="outline" size="sm" disabled={busy}>
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
        }
      />
    </div>
  );
}
