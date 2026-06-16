'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { correctionSchema, type CorrectionValues } from '@/schemas/attendance.schema';
import { createCorrection, type CreateCorrectionPayload } from '@/features/attendance/api';
import { getApiErrorMessage } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, DateField, TextareaField } from '@/components/ui/form';
import { DateTimeField } from '@/features/attendance/components/DateTimeField';
import { toast } from '@/components/ui/sonner';

/** Convert a non-empty form value to an ISO string, else undefined. */
function iso(value?: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function CorrectionForm() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      date: '',
      requestedTimeIn: '',
      requestedTimeOut: '',
      requestedBreakIn: '',
      requestedBreakOut: '',
      reason: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateCorrectionPayload) => createCorrection(payload),
    onSuccess: () => {
      toast.success('Correction request submitted');
      qc.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
      form.reset();
      setOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function onSubmit(values: CorrectionValues) {
    mutation.mutate({
      date: new Date(values.date).toISOString(),
      requestedTimeIn: iso(values.requestedTimeIn || undefined),
      requestedTimeOut: iso(values.requestedTimeOut || undefined),
      requestedBreakIn: iso(values.requestedBreakIn || undefined),
      requestedBreakOut: iso(values.requestedBreakOut || undefined),
      reason: values.reason,
    });
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) form.reset();
  }

  const submitting = mutation.isPending;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Request Correction
      </Button>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Request Attendance Correction"
        description="Pick the date to correct and the requested punch times. Provide at least one time."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="correction-form" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </>
        }
      >
        <Form id="correction-form" form={form} onSubmit={onSubmit}>
          <DateField name="date" label="Date" required />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateTimeField name="requestedTimeIn" label="Time In" />
            <DateTimeField name="requestedTimeOut" label="Time Out" />
          </div>

          <TextareaField
            name="reason"
            label="Reason"
            required
            placeholder="Explain why this correction is needed…"
          />
        </Form>
      </Modal>
    </>
  );
}
