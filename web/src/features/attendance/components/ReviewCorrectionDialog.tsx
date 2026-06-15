'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, X } from 'lucide-react';
import { approveCorrection, rejectCorrection } from '@/features/attendance/api';
import { reviewCorrectionSchema, type ReviewCorrectionValues } from '@/schemas/attendance.schema';
import { getApiErrorMessage } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, TextareaField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

type Mode = 'approve' | 'reject';

export function ReviewCorrectionDialog({ id, mode }: { id: string; mode: Mode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const form = useForm<ReviewCorrectionValues>({
    resolver: zodResolver(reviewCorrectionSchema),
    defaultValues: { reviewNote: '' },
  });

  const isApprove = mode === 'approve';

  const mutation = useMutation({
    mutationFn: (reviewNote?: string) =>
      isApprove ? approveCorrection(id, reviewNote) : rejectCorrection(id, reviewNote),
    onSuccess: () => {
      toast.success(isApprove ? 'Correction approved' : 'Correction rejected');
      qc.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
      form.reset();
      setOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function onSubmit(values: ReviewCorrectionValues) {
    mutation.mutate(values.reviewNote || undefined);
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) form.reset();
  }

  const submitting = mutation.isPending;

  return (
    <>
      <Button size="sm" variant={isApprove ? 'default' : 'destructive'} onClick={() => setOpen(true)}>
        {isApprove ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {isApprove ? 'Approve' : 'Reject'}
      </Button>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={isApprove ? 'Approve correction' : 'Reject correction'}
        description={
          isApprove
            ? 'Approving will create or adjust the attendance record with the requested times.'
            : 'Optionally add a note explaining the rejection.'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="review-correction-form"
              variant={isApprove ? 'default' : 'destructive'}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isApprove ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <Form id="review-correction-form" form={form} onSubmit={onSubmit}>
          <TextareaField
            name="reviewNote"
            label="Review note (optional)"
            placeholder="Add a note…"
          />
        </Form>
      </Modal>
    </>
  );
}
