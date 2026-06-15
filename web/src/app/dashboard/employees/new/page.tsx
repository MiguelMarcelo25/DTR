'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, TextField, DateField, SelectField, CheckboxField, type SelectOption } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { createEmployee } from '@/features/employees/api';
import {
  listDepartments,
  listPositions,
  listBranches,
  listSchedules,
} from '@/features/admin/api';
import {
  createEmployeeSchema,
  type CreateEmployeeValues,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  ACCOUNT_ROLES,
  SELECT_NONE,
} from '@/schemas/employees.schema';

/** Strip empty strings / None sentinel → undefined so optional UUIDs aren't sent blank. */
function v(value?: string) {
  const t = value?.trim();
  return t && t !== SELECT_NONE ? t : undefined;
}

const noneOption: SelectOption = { label: 'None', value: SELECT_NONE };
const typeOptions: SelectOption[] = EMPLOYMENT_TYPES.map((t) => ({ label: t.replace(/_/g, ' '), value: t }));
const statusOptions: SelectOption[] = EMPLOYMENT_STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s }));
const roleOptions: SelectOption[] = ACCOUNT_ROLES.map((r) => ({ label: r.replace(/_/g, ' '), value: r }));

export default function NewEmployeePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasRole } = useAuth();

  const form = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employmentType: 'PROBATIONARY',
      employmentStatus: 'ACTIVE',
      departmentId: SELECT_NONE,
      positionId: SELECT_NONE,
      branchId: SELECT_NONE,
      scheduleId: SELECT_NONE,
      accountRole: 'EMPLOYEE',
      createAccount: false,
    },
  });

  const createAccount = form.watch('createAccount');

  const departmentsQuery = useQuery({ queryKey: ['lookup', 'departments'], queryFn: () => listDepartments() });
  const positionsQuery = useQuery({ queryKey: ['lookup', 'positions'], queryFn: () => listPositions() });
  const branchesQuery = useQuery({ queryKey: ['lookup', 'branches'], queryFn: () => listBranches() });
  const schedulesQuery = useQuery({ queryKey: ['lookup', 'schedules'], queryFn: () => listSchedules() });

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

  const mutation = useMutation({
    mutationFn: (values: CreateEmployeeValues) => {
      const payload: Record<string, unknown> = {
        employeeNo: v(values.employeeNo),
        departmentId: v(values.departmentId),
        positionId: v(values.positionId),
        branchId: v(values.branchId),
        scheduleId: v(values.scheduleId),
        supervisorId: v(values.supervisorId),
        employmentType: values.employmentType,
        employmentStatus: values.employmentStatus,
        rank: v(values.rank),
        dateHired: values.dateHired,
        profile: {
          firstName: values.firstName,
          middleName: v(values.middleName),
          lastName: values.lastName,
          suffix: v(values.suffix),
          contactNumber: v(values.contactNumber),
          email: v(values.email),
          currentAddress: v(values.currentAddress),
        },
      };
      if (createAccount && values.accountEmail && values.accountPassword) {
        payload.account = {
          email: values.accountEmail,
          password: values.accountPassword,
          role: values.accountRole ?? 'EMPLOYEE',
        };
      }
      // remove undefined top-level keys
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      return createEmployee(payload);
    },
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created.');
      router.push(`/dashboard/employees/${emp.id}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to create employee')),
  });

  function onSubmit(values: CreateEmployeeValues) {
    if (createAccount) {
      if (!values.accountEmail) {
        toast.error('Account email is required when creating a login.');
        return;
      }
      if (!values.accountPassword || values.accountPassword.length < 8) {
        toast.error('Account password must be at least 8 characters.');
        return;
      }
    }
    mutation.mutate(values);
  }

  // Only the Super Admin may create employee accounts.
  if (!hasRole('SUPER_ADMIN')) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Add Employee" />
        <EmptyState
          icon={ShieldAlert}
          title="Restricted"
          description="Only the Super Admin can create employee accounts."
          action={
            <Button variant="outline" asChild>
              <Link href="/dashboard/employees">Back to employees</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader
          title="Add Employee"
          description="Create a new employee record."
          action={
            <Button variant="outline" asChild>
              <Link href="/dashboard/employees">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
      </div>

      <Form form={form} onSubmit={onSubmit} className="space-y-6">
        {/* Personal */}
        <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '60ms' }}>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField name="firstName" label="First name" required />
            <TextField name="lastName" label="Last name" required />
            <TextField name="middleName" label="Middle name" />
            <TextField name="suffix" label="Suffix" placeholder="Jr., III" />
            <TextField name="email" label="Personal email" type="email" />
            <TextField name="contactNumber" label="Contact number" type="tel" />
            <TextField name="currentAddress" label="Current address" className="sm:col-span-2" />
          </CardContent>
        </Card>

        {/* Employment */}
        <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '120ms' }}>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField name="employeeNo" label="Employee no." placeholder="Auto-generated if blank" />
            <DateField name="dateHired" label="Date hired" required />
            <SelectField name="employmentType" label="Employment type" options={typeOptions} placeholder="Select type" />
            <SelectField name="employmentStatus" label="Employment status" options={statusOptions} placeholder="Select status" />
            <TextField name="rank" label="Rank" />
            <SelectField name="departmentId" label="Department" options={departmentOptions} placeholder="Select department" />
            <SelectField name="positionId" label="Position" options={positionOptions} placeholder="Select position" />
            <SelectField name="branchId" label="Branch" options={branchOptions} placeholder="Select branch" />
            <SelectField name="scheduleId" label="Schedule" options={scheduleOptions} placeholder="Select schedule" />
            <TextField name="supervisorId" label="Supervisor ID" placeholder="Employee UUID" />
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '180ms' }}>
          <CardHeader>
            <CardTitle>Login Account (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CheckboxField name="createAccount" label="Create a login account for this employee" />

            {createAccount && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="accountEmail" label="Account email" type="email" />
                <TextField
                  name="accountPassword"
                  label="Password"
                  type="password"
                  description="Minimum 8 characters."
                />
                <SelectField name="accountRole" label="Role" options={roleOptions} placeholder="Select role" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>
      </Form>
    </div>
  );
}
