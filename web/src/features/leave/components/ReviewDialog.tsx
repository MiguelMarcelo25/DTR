'use client';

import { useState, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  approveRequestSchema,
  rejectRequestSchema,
  type ApproveRequestValues,
  type RejectRequestValues,
} from '@/schemas/leave.schema';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, TextareaField } from '@/components/ui/form';

type ReviewValues = ApproveRequestValues | RejectRequestValues;

/**
 * Shared dialog for approving (optional note) or rejecting (required reason)
 * a leave request. `mode` controls validation and button styling.
 */
export function ReviewDialog({
  trigger,
  mode,
  title,
  description,
  onSubmit,
}: {
  trigger: ReactNode;
  mode: 'approve' | 'reject';
  title: string;
  description?: string;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const isReject = mode === 'reject';

  const form = useForm<ReviewValues>({
    resolver: zodResolver(isReject ? rejectRequestSchema : approveRequestSchema),
    defaultValues: { reviewNote: '' },
  });

  const submitting = form.formState.isSubmitting;

  async function handle(values: ReviewValues) {
    try {
      await onSubmit((values.reviewNote ?? '').trim());
      setOpen(false);
      form.reset({ reviewNote: '' });
    } catch {
      // Error toast is handled by the caller's mutation.
    }
  }

  return (
    <>
      <Slot
        onClick={() => {
          form.reset({ reviewNote: '' });
          setOpen(true);
        }}
      >
        {trigger}
      </Slot>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) form.reset({ reviewNote: '' });
        }}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="review-form"
              variant={isReject ? 'destructive' : 'default'}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isReject ? 'Reject' : 'Approve'}
            </Button>
          </>
        }
      >
        <Form id="review-form" form={form} onSubmit={handle}>
          <TextareaField
            name="reviewNote"
            label={isReject ? 'Reason' : 'Note (optional)'}
            required={isReject}
            placeholder={isReject ? 'Why is this being rejected?' : 'Add an optional note…'}
            rows={4}
          />
        </Form>
      </Modal>
    </>
  );
}
