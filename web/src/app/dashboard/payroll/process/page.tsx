'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, TextField, DateField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { processPayrollSchema, type ProcessPayrollValues } from '@/schemas/payroll.schema';
import { processPayroll } from '@/features/payroll/api';

export default function ProcessPayrollPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const isAdmin = hasRole('SUPER_ADMIN', 'ADMIN');

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard/payroll');
  }, [isAdmin, router]);

  const form = useForm<ProcessPayrollValues>({
    resolver: zodResolver(processPayrollSchema),
    defaultValues: { name: '', startDate: '', endDate: '', payDate: '' },
  });

  const mutation = useMutation({
    mutationFn: processPayroll,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['payroll', 'periods'] });
      toast.success(`Payroll processed for ${result.processed} employee(s)`);
      router.push('/dashboard/payroll');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  async function onSubmit(values: ProcessPayrollValues) {
    await mutation.mutateAsync({
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      payDate: values.payDate ? values.payDate : undefined,
    });
  }

  if (!isAdmin) return null;

  const pending = form.formState.isSubmitting || mutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Process Payroll"
        description="Create and compute a new payroll period for all active employees."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/payroll">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl animate-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            New Payroll Period
          </CardTitle>
          <CardDescription>
            Payroll is computed from attendance and approved leave within the date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={onSubmit} className="space-y-4">
            <TextField
              name="name"
              label="Period name"
              required
              placeholder="e.g. June 2026 — 1st Half"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <DateField name="startDate" label="Start date" required />
              <DateField name="endDate" label="End date" required />
            </div>

            <DateField name="payDate" label="Pay date" description="Optional" />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/payroll">Cancel</Link>
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Process Payroll
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
