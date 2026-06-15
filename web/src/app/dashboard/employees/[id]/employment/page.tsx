'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Power, Archive } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Form, TextField, DateField, SelectField, type SelectOption } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import {
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  archiveEmployee,
} from '@/features/employees/api';
import {
  listDepartments,
  listPositions,
  listBranches,
  listSchedules,
} from '@/features/admin/api';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';
import {
  employmentSchema,
  type EmploymentValues,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  SELECT_NONE,
} from '@/schemas/employees.schema';

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** '' / None sentinel → null (disconnect), undefined left as-is. */
function ref(value: string | undefined, original: string | null): string | null | undefined {
  const raw = value?.trim() ?? '';
  const t = raw === SELECT_NONE ? '' : raw;
  if (t === '' && original === null) return undefined; // unchanged
  if (t === '') return null; // explicit disconnect
  return t;
}

const typeOptions: SelectOption[] = EMPLOYMENT_TYPES.map((t) => ({ label: t.replace(/_/g, ' '), value: t }));
const statusOptions: SelectOption[] = EMPLOYMENT_STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s }));
const noneOption: SelectOption = { label: 'None', value: SELECT_NONE };

export default function EmployeeEmploymentPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');
  const canArchive = hasRole('SUPER_ADMIN', 'ADMIN');

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id),
    enabled: !!id,
  });

  const departmentsQuery = useQuery({
    queryKey: ['lookup', 'departments'],
    queryFn: () => listDepartments(),
    enabled: canManage,
  });
  const positionsQuery = useQuery({
    queryKey: ['lookup', 'positions'],
    queryFn: () => listPositions(),
    enabled: canManage,
  });
  const branchesQuery = useQuery({
    queryKey: ['lookup', 'branches'],
    queryFn: () => listBranches(),
    enabled: canManage,
  });
  const schedulesQuery = useQuery({
    queryKey: ['lookup', 'schedules'],
    queryFn: () => listSchedules(),
    enabled: canManage,
  });

  const departmentOptions: SelectOption[] = [
    noneOption,
    ...(departmentsQuery.data ?? []).map((d) => ({ label: d.name, value: d.id })),
  ];
  const positionOptions: SelectOption[] = [
    noneOption,
    ...(positionsQuery.data ?? []).map((p) => ({ label: p.title, value: p.id })),
  ];
  const branchOptions: SelectOption[] = [
    noneOption,
    ...(branchesQuery.data ?? []).map((b) => ({ label: b.name, value: b.id })),
  ];
  const scheduleOptions: SelectOption[] = [
    noneOption,
    ...(schedulesQuery.data ?? []).map((s) => ({ label: s.name, value: s.id })),
  ];

  const form = useForm<EmploymentValues>({ resolver: zodResolver(employmentSchema) });
  const { reset, formState } = form;
  const { isDirty } = formState;

  useEffect(() => {
    if (!employee) return;
    reset({
      departmentId: employee.departmentId ?? SELECT_NONE,
      positionId: employee.positionId ?? SELECT_NONE,
      branchId: employee.branchId ?? SELECT_NONE,
      scheduleId: employee.scheduleId ?? SELECT_NONE,
      supervisorId: employee.supervisorId ?? '',
      employmentType: employee.employmentType,
      employmentStatus: employee.employmentStatus,
      rank: employee.rank ?? '',
      dateHired: toDateInput(employee.dateHired),
      regularizationDate: toDateInput(employee.regularizationDate),
    });
  }, [employee, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: EmploymentValues) => {
      if (!employee) throw new Error('Not loaded');
      const payload: Record<string, unknown> = {
        departmentId: ref(values.departmentId, employee.departmentId),
        positionId: ref(values.positionId, employee.positionId),
        branchId: ref(values.branchId, employee.branchId),
        scheduleId: ref(values.scheduleId, employee.scheduleId),
        supervisorId: ref(values.supervisorId, employee.supervisorId),
        employmentType: values.employmentType,
        employmentStatus: values.employmentStatus,
        rank: values.rank?.trim() ? values.rank.trim() : null,
        dateHired: values.dateHired || undefined,
        regularizationDate: values.regularizationDate ? values.regularizationDate : null,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      return updateEmployee(id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Employment details updated.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to update employment')),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deactivated.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee archived.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader title="Employment" description="Assignment, status and key dates." />
        <EmployeeTabs employeeId={id} />
      </div>

      {isLoading || !employee ? (
        <Skeleton className="h-80 w-full" />
      ) : !canManage ? (
        <Card className="rounded-xl border bg-card shadow-soft">
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have permission to edit employment details.
          </CardContent>
        </Card>
      ) : (
        <Form form={form} onSubmit={(v) => updateMutation.mutate(v)} className="space-y-6">
          <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '60ms' }}>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SelectField name="departmentId" label="Department" options={departmentOptions} placeholder="Select department" />
              <SelectField name="positionId" label="Position" options={positionOptions} placeholder="Select position" />
              <SelectField name="branchId" label="Branch" options={branchOptions} placeholder="Select branch" />
              <SelectField name="scheduleId" label="Schedule" options={scheduleOptions} placeholder="Select schedule" />
              <TextField name="supervisorId" label="Supervisor ID" placeholder="Employee UUID" />
              <TextField name="rank" label="Rank" />
            </CardContent>
          </Card>

          <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '120ms' }}>
            <CardHeader>
              <CardTitle>Status &amp; Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SelectField name="employmentType" label="Employment type" options={typeOptions} placeholder="Select" />
              <SelectField name="employmentStatus" label="Employment status" options={statusOptions} placeholder="Select" />
              <DateField name="dateHired" label="Date hired" />
              <DateField name="regularizationDate" label="Regularization date" />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>

          {canArchive && (
            <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '180ms' }}>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline" disabled={deactivateMutation.isPending}>
                      <Power className="h-4 w-4" />
                      Deactivate
                    </Button>
                  }
                  title="Deactivate employee?"
                  description="Sets status to INACTIVE and disables any linked login account."
                  confirmLabel="Deactivate"
                  onConfirm={() => deactivateMutation.mutateAsync()}
                />
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="destructive" disabled={archiveMutation.isPending}>
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  }
                  title="Archive employee?"
                  description="Archives the employee record. This can be reversed by an administrator."
                  confirmLabel="Archive"
                  destructive
                  onConfirm={() => archiveMutation.mutateAsync()}
                />
              </CardContent>
            </Card>
          )}
        </Form>
      )}
    </div>
  );
}
