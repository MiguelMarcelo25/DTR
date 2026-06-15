'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Form,
  TextField,
  TextareaField,
  SelectField,
  DateField,
  type SelectOption,
} from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { bookAppointmentSchema, type BookAppointmentValues } from '@/schemas/appointments.schema';
import { bookAppointment, listSlots, type AppointmentSlot } from '@/features/appointments/api';

const NO_SLOT = 'NONE';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: slotsData } = useQuery({
    queryKey: ['appointments', 'slots', 'active', { from: todayISO() }],
    queryFn: () =>
      listSlots({ isActive: true, from: todayISO(), limit: 100, sort: 'date', order: 'asc' }),
  });
  const slots = slotsData?.items ?? [];

  const form = useForm<BookAppointmentValues>({
    resolver: zodResolver(bookAppointmentSchema),
    defaultValues: {
      slotId: '',
      purpose: '',
      scheduledDate: todayISO(),
      scheduledTime: '09:00',
      note: '',
    },
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  // SelectField writes the chosen option's value into `slotId`. The schema only
  // accepts a uuid or '', so the NO_SLOT sentinel is normalised back to '' below.
  const rawSlotId = watch('slotId');
  const selectedSlotId = !rawSlotId || rawSlotId === NO_SLOT ? '' : rawSlotId;

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId),
    [slots, selectedSlotId],
  );

  // When a slot is chosen, mirror its date/time/purpose into the form; when the
  // sentinel is picked, clear the stored value so the payload/schema stay valid.
  const prevSlotId = useRef('');
  useEffect(() => {
    if (rawSlotId === NO_SLOT) {
      setValue('slotId', '');
    } else if (selectedSlotId && selectedSlotId !== prevSlotId.current) {
      applySlot(slots.find((s) => s.id === selectedSlotId));
    }
    prevSlotId.current = selectedSlotId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSlotId, selectedSlotId, slots]);

  function applySlot(slot: AppointmentSlot | undefined) {
    if (!slot) return;
    setValue('scheduledDate', slot.date.slice(0, 10), { shouldValidate: true });
    setValue('scheduledTime', slot.startTime, { shouldValidate: true });
    if (slot.purpose) setValue('purpose', slot.purpose, { shouldValidate: true });
  }

  const slotOptions: SelectOption[] = [
    { label: 'No slot — custom date/time', value: NO_SLOT },
    ...slots.map((s) => ({
      value: s.id,
      label: `${formatDate(s.date)} · ${s.startTime}–${s.endTime}${s.location ? ` · ${s.location}` : ''}`,
    })),
  ];

  const mutation = useMutation({
    mutationFn: (values: BookAppointmentValues) =>
      bookAppointment({
        slotId: values.slotId ? values.slotId : undefined,
        purpose: values.purpose.trim(),
        scheduledDate: values.scheduledDate,
        scheduledTime: values.scheduledTime,
        note: values.note?.trim() ? values.note.trim() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked');
      router.push('/dashboard/appointments');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Book Appointment"
        description="Choose an available slot or request a custom date and time."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/appointments">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl animate-fade-up rounded-xl border bg-card shadow-soft">
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={(v) => mutation.mutate(v)}>
            <div className="space-y-1.5">
              <SelectField
                name="slotId"
                label="Available slot (optional)"
                placeholder="No slot — custom date/time"
                options={slotOptions}
              />
              {selectedSlot && (
                <p className="text-xs text-muted-foreground">
                  Capacity {selectedSlot.capacity}
                  {selectedSlot.purpose ? ` · ${selectedSlot.purpose}` : ''}
                </p>
              )}
              {slots.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active slots published — enter a custom date and time below.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateField name="scheduledDate" label="Date" required disabled={!!selectedSlotId} />
              <div className="space-y-1.5">
                <Label htmlFor="scheduledTime" className="text-foreground">
                  Time<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  disabled={!!selectedSlotId}
                  {...register('scheduledTime')}
                />
                {errors.scheduledTime && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.scheduledTime.message}
                  </p>
                )}
              </div>
            </div>

            <TextField
              name="purpose"
              label="Purpose"
              required
              placeholder="e.g. HR consultation, document signing…"
            />

            <TextareaField name="note" label="Note" placeholder="Anything we should know?" />

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" type="button">
                <Link href="/dashboard/appointments">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {(isSubmitting || mutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Book appointment
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
