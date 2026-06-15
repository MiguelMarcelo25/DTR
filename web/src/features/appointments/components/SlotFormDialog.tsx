'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Form,
  TextField,
  NumberField,
  DateField,
  CheckboxField,
} from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { slotSchema, type SlotValues } from '@/schemas/appointments.schema';
import {
  createSlot,
  updateSlot,
  type AppointmentSlot,
  type CreateSlotPayload,
  type UpdateSlotPayload,
} from '@/features/appointments/api';

function defaults(slot?: AppointmentSlot): SlotValues {
  return {
    date: slot ? slot.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    startTime: slot?.startTime ?? '09:00',
    endTime: slot?.endTime ?? '10:00',
    capacity: slot?.capacity ?? 1,
    location: slot?.location ?? '',
    purpose: slot?.purpose ?? '',
    isActive: slot?.isActive ?? true,
  };
}

export function SlotFormDialog({
  slot,
  trigger,
}: {
  slot?: AppointmentSlot;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const editing = !!slot;

  const form = useForm<SlotValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: defaults(slot),
  });

  const {
    register,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: (values: SlotValues) => {
      const payload: CreateSlotPayload & UpdateSlotPayload = {
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        capacity: values.capacity,
        location: values.location?.trim() ? values.location.trim() : undefined,
        purpose: values.purpose?.trim() ? values.purpose.trim() : undefined,
        isActive: values.isActive,
      };
      return editing ? updateSlot(slot!.id, payload) : createSlot(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment-slots'] });
      toast.success(editing ? 'Slot updated' : 'Slot created');
      setOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) form.reset(defaults(slot));
  }

  return (
    <>
      <span
        className="contents cursor-pointer"
        onClick={() => handleOpenChange(true)}
      >
        {trigger}
      </span>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={editing ? 'Edit slot' : 'New slot'}
        description="Define when employees can book and how many can be seen."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form="slot-form" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create slot'}
            </Button>
          </>
        }
      >
        <Form id="slot-form" form={form} onSubmit={(v) => mutation.mutate(v)}>
          <DateField name="date" label="Date" required />

          {/* Native time inputs — no TimeField in the design system. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="slot-start" className="text-foreground">
                Start time<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="slot-start" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-xs font-medium text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end" className="text-foreground">
                End time<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="slot-end" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-xs font-medium text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <NumberField name="capacity" label="Capacity" min={1} required />
          <TextField name="location" label="Location" placeholder="e.g. HR Office, Room 2" />
          <TextField name="purpose" label="Purpose" placeholder="e.g. Consultation" />
          <CheckboxField name="isActive" label="Active (available for booking)" />
        </Form>
      </Modal>
    </>
  );
}
