'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { leaveRequestSchema, type LeaveRequestValues } from '@/schemas/leave.schema';
import { createLeaveRequest, fetchLeaveTypes } from '@/features/leave/api';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  SelectField,
  DateField,
  TextareaField,
  type SelectOption,
} from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

function inclusiveDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return 0;
  const ms = e.getTime() - s.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const typesQuery = useQuery({ queryKey: ['leave', 'types'], queryFn: fetchLeaveTypes });

  const form = useForm<LeaveRequestValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leaveTypeId: '', startDate: '', endDate: '', reason: '' },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const days = useMemo(() => inclusiveDays(startDate, endDate), [startDate, endDate]);

  const mutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave request submitted.');
      router.push('/dashboard/leave/history');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function onSubmit(values: LeaveRequestValues) {
    mutation.mutate({
      leaveTypeId: values.leaveTypeId,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason || undefined,
    });
  }

  const typeOptions: SelectOption[] = (typesQuery.data ?? []).map((t) => ({
    label: t.isPaid ? t.name : `${t.name} (Unpaid)`,
    value: t.id,
  }));

  const submitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Request Leave"
        description="Submit a new leave request for approval."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/leave">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl animate-fade-up">
        <CardContent className="pt-6">
          <Form form={form} onSubmit={onSubmit}>
            <SelectField
              name="leaveTypeId"
              label="Leave Type"
              required
              placeholder={typesQuery.isLoading ? 'Loading…' : 'Select a leave type'}
              disabled={typesQuery.isLoading}
              options={typeOptions}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <DateField name="startDate" label="Start Date" required />
              <DateField name="endDate" label="End Date" required />
            </div>

            {days > 0 && (
              <p className="text-sm text-muted-foreground">
                Duration: <span className="font-medium text-foreground">{days} day(s)</span>
              </p>
            )}

            <TextareaField
              name="reason"
              label="Reason (optional)"
              placeholder="Briefly describe the reason for your leave…"
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/leave">Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
