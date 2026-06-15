'use client';

import { useState, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { adjustBalanceSchema, type AdjustBalanceValues } from '@/schemas/leave.schema';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, NumberField } from '@/components/ui/form';

/**
 * Adjust a single leave balance (entitled / used). The leaveTypeId and year are
 * fixed by the row being edited and submitted alongside the form values.
 */
export function AdjustBalanceDialog({
  trigger,
  title,
  description,
  leaveTypeId,
  year,
  defaultEntitled,
  defaultUsed,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  leaveTypeId: string;
  year: number;
  defaultEntitled: number;
  defaultUsed: number;
  onSubmit: (payload: { leaveTypeId: string; year: number; entitled: number; used: number }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<AdjustBalanceValues>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { leaveTypeId, year, entitled: defaultEntitled, used: defaultUsed },
  });

  const submitting = form.formState.isSubmitting;

  async function submit(values: AdjustBalanceValues) {
    await onSubmit({
      leaveTypeId,
      year,
      entitled: Number(values.entitled ?? defaultEntitled),
      used: Number(values.used ?? defaultUsed),
    });
    setOpen(false);
  }

  return (
    <>
      <Slot
        onClick={() => {
          form.reset({ leaveTypeId, year, entitled: defaultEntitled, used: defaultUsed });
          setOpen(true);
        }}
      >
        {trigger}
      </Slot>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) form.reset({ leaveTypeId, year, entitled: defaultEntitled, used: defaultUsed });
        }}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="adjust-balance-form" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </>
        }
      >
        <Form id="adjust-balance-form" form={form} onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField name="entitled" label="Entitled (days)" min={0} step={0.5} />
            <NumberField name="used" label="Used (days)" min={0} step={0.5} />
          </div>
        </Form>
      </Modal>
    </>
  );
}
