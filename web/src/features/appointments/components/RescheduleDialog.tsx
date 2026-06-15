'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, DateField, TextareaField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import {
  rescheduleAppointmentSchema,
  type RescheduleAppointmentValues,
} from '@/schemas/appointments.schema';
import { rescheduleAppointment, type Appointment } from '@/features/appointments/api';

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();

  function makeDefaults(): RescheduleAppointmentValues {
    return {
      scheduledDate: appointment.scheduledDate?.slice(0, 10),
      scheduledTime: appointment.scheduledTime,
      note: appointment.note ?? '',
    };
  }

  const form = useForm<RescheduleAppointmentValues>({
    resolver: zodResolver(rescheduleAppointmentSchema),
    defaultValues: makeDefaults(),
  });

  const {
    register,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: (values: RescheduleAppointmentValues) =>
      rescheduleAppointment(appointment.id, {
        scheduledDate: values.scheduledDate,
        scheduledTime: values.scheduledTime,
        note: values.note?.trim() ? values.note.trim() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments', 'calendar'] });
      toast.success('Appointment rescheduled');
      onOpenChange(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (o) form.reset(makeDefaults());
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Reschedule appointment"
      description="Pick a new date and time. The request will be set back to pending for review."
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="reschedule-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reschedule
          </Button>
        </>
      }
    >
      <Form id="reschedule-form" form={form} onSubmit={(v) => mutation.mutate(v)}>
        <div className="grid grid-cols-2 gap-4">
          <DateField name="scheduledDate" label="Date" required />
          <div className="space-y-1.5">
            <Label htmlFor="rs-time" className="text-foreground">
              Time<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="rs-time" type="time" {...register('scheduledTime')} />
            {errors.scheduledTime && (
              <p className="text-xs font-medium text-destructive">{errors.scheduledTime.message}</p>
            )}
          </div>
        </div>
        <TextareaField name="note" label="Note" placeholder="Reason for rescheduling…" />
      </Form>
    </Modal>
  );
}
