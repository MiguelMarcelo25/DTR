'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, CalendarClock, XCircle, Check, Ban, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  cancelAppointment,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
  type Appointment,
} from '@/features/appointments/api';
import { RescheduleDialog } from './RescheduleDialog';
import { NoteActionDialog } from './NoteActionDialog';

const LIVE = new Set(['PENDING', 'APPROVED', 'RESCHEDULED']);

type ActiveAction = 'reschedule' | 'cancel' | 'approve' | 'reject' | 'complete' | null;

export function AppointmentRowActions({ appointment }: { appointment: Appointment }) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const privileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [action, setAction] = useState<ActiveAction>(null);
  const close = () => setAction(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] });
  };

  const cancel = useMutation({
    mutationFn: (note?: string) => cancelAppointment(appointment.id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment cancelled');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const approve = useMutation({
    mutationFn: (note?: string) => approveAppointment(appointment.id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment approved');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: (note?: string) => rejectAppointment(appointment.id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment rejected');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const complete = useMutation({
    mutationFn: (note?: string) => completeAppointment(appointment.id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment completed');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const isLive = LIVE.has(appointment.status);
  const isPending = appointment.status === 'PENDING';
  const isApproved = appointment.status === 'APPROVED';

  const ownerCanAct = isLive;
  const privilegedCanAct = privileged && (isPending || isApproved);

  if (!ownerCanAct && !privilegedCanAct) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isLive && (
            <DropdownMenuItem onSelect={() => setAction('reschedule')}>
              <CalendarClock className="h-4 w-4" />
              Reschedule
            </DropdownMenuItem>
          )}
          {isLive && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setAction('cancel')}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          )}

          {privilegedCanAct && (isLive || isApproved) && <DropdownMenuSeparator />}

          {privileged && isPending && (
            <DropdownMenuItem onSelect={() => setAction('approve')}>
              <Check className="h-4 w-4" />
              Approve
            </DropdownMenuItem>
          )}
          {privileged && isPending && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setAction('reject')}
            >
              <Ban className="h-4 w-4" />
              Reject
            </DropdownMenuItem>
          )}
          {privileged && isApproved && (
            <DropdownMenuItem onSelect={() => setAction('complete')}>
              <CheckCircle2 className="h-4 w-4" />
              Mark completed
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RescheduleDialog
        appointment={appointment}
        open={action === 'reschedule'}
        onOpenChange={(o) => (o ? setAction('reschedule') : close())}
      />

      <NoteActionDialog
        open={action === 'cancel'}
        onOpenChange={(o) => (o ? setAction('cancel') : close())}
        title="Cancel appointment"
        description="This cannot be undone."
        confirmLabel="Cancel appointment"
        notePlaceholder="Reason (optional)…"
        destructive
        onConfirm={(note) => cancel.mutateAsync(note)}
      />

      <NoteActionDialog
        open={action === 'approve'}
        onOpenChange={(o) => (o ? setAction('approve') : close())}
        title="Approve appointment"
        confirmLabel="Approve"
        notePlaceholder="Note for the employee (optional)…"
        onConfirm={(note) => approve.mutateAsync(note)}
      />

      <NoteActionDialog
        open={action === 'reject'}
        onOpenChange={(o) => (o ? setAction('reject') : close())}
        title="Reject appointment"
        confirmLabel="Reject"
        notePlaceholder="Reason for rejection…"
        destructive
        onConfirm={(note) => reject.mutateAsync(note)}
      />

      <NoteActionDialog
        open={action === 'complete'}
        onOpenChange={(o) => (o ? setAction('complete') : close())}
        title="Complete appointment"
        confirmLabel="Mark completed"
        notePlaceholder="Note (optional)…"
        onConfirm={(note) => complete.mutateAsync(note)}
      />
    </>
  );
}
