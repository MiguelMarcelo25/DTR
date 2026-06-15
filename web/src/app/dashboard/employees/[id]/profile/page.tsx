'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, TextField, DateField, SelectField, type SelectOption } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { getProfile, updateProfile } from '@/features/employees/api';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';
import {
  profileSchema,
  type ProfileValues,
  GENDERS,
  CIVIL_STATUSES,
  SALARY_TYPES,
} from '@/schemas/employees.schema';

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function s(value?: string) {
  const t = value?.trim();
  return t ? t : null;
}

const genderOptions: SelectOption[] = GENDERS.map((g) => ({ label: g, value: g }));
const civilStatusOptions: SelectOption[] = CIVIL_STATUSES.map((c) => ({ label: c, value: c }));
const salaryTypeOptions: SelectOption[] = SALARY_TYPES.map((t) => ({ label: t, value: t }));

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');
  const privileged = canEdit; // sensitive fields visible to same privileged set

  const { data: profile, isLoading } = useQuery({
    queryKey: ['employee', id, 'profile'],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });

  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const { reset, formState } = form;
  const { isDirty } = formState;

  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.firstName ?? '',
      middleName: profile.middleName ?? '',
      lastName: profile.lastName ?? '',
      suffix: profile.suffix ?? '',
      dateOfBirth: toDateInput(profile.dateOfBirth),
      gender: profile.gender ?? undefined,
      civilStatus: profile.civilStatus ?? undefined,
      nationality: profile.nationality ?? '',
      contactNumber: profile.contactNumber ?? '',
      email: profile.email ?? '',
      currentAddress: profile.currentAddress ?? '',
      permanentAddress: profile.permanentAddress ?? '',
      tin: profile.tin ?? '',
      sss: profile.sss ?? '',
      philhealth: profile.philhealth ?? '',
      pagibig: profile.pagibig ?? '',
      bankName: profile.bankName ?? '',
      bankAccountNumber: profile.bankAccountNumber ?? '',
      salaryType: profile.salaryType ?? undefined,
      basicSalary: profile.basicSalary !== undefined ? String(profile.basicSalary) : '',
      allowances: profile.allowances !== undefined ? String(profile.allowances) : '',
      taxStatus: profile.taxStatus ?? '',
    });
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => {
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        middleName: s(values.middleName),
        lastName: values.lastName,
        suffix: s(values.suffix),
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth : null,
        gender: values.gender ?? null,
        civilStatus: values.civilStatus ?? null,
        nationality: s(values.nationality),
        contactNumber: s(values.contactNumber),
        email: s(values.email),
        currentAddress: s(values.currentAddress),
        permanentAddress: s(values.permanentAddress),
      };
      if (privileged) {
        payload.tin = s(values.tin);
        payload.sss = s(values.sss);
        payload.philhealth = s(values.philhealth);
        payload.pagibig = s(values.pagibig);
        payload.bankName = s(values.bankName);
        payload.bankAccountNumber = s(values.bankAccountNumber);
        payload.taxStatus = s(values.taxStatus);
        if (values.salaryType) payload.salaryType = values.salaryType;
        if (values.basicSalary !== undefined && values.basicSalary !== '') {
          payload.basicSalary = Number(values.basicSalary);
        }
        if (values.allowances !== undefined && values.allowances !== '') {
          payload.allowances = Number(values.allowances);
        }
      }
      return updateProfile(id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id, 'profile'] });
      qc.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Profile updated.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to update profile')),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader title="Profile" description="Personal and statutory information." />
        <EmployeeTabs employeeId={id} />
      </div>

      {isLoading || !profile ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Form form={form} onSubmit={(v) => mutation.mutate(v)} className="space-y-6">
          <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '60ms' }}>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <TextField name="firstName" label="First name" required disabled={!canEdit} />
              <TextField name="lastName" label="Last name" required disabled={!canEdit} />
              <TextField name="middleName" label="Middle name" disabled={!canEdit} />
              <TextField name="suffix" label="Suffix" disabled={!canEdit} />
              <DateField name="dateOfBirth" label="Date of birth" disabled={!canEdit} />
              <SelectField name="gender" label="Gender" options={genderOptions} placeholder="Select" disabled={!canEdit} />
              <SelectField
                name="civilStatus"
                label="Civil status"
                options={civilStatusOptions}
                placeholder="Select"
                disabled={!canEdit}
              />
              <TextField name="nationality" label="Nationality" disabled={!canEdit} />
              <TextField name="contactNumber" label="Contact number" type="tel" disabled={!canEdit} />
              <TextField name="email" label="Email" type="email" disabled={!canEdit} />
              <TextField name="currentAddress" label="Current address" className="sm:col-span-2" disabled={!canEdit} />
              <TextField name="permanentAddress" label="Permanent address" className="sm:col-span-2" disabled={!canEdit} />
            </CardContent>
          </Card>

          {/* Sensitive */}
          {privileged ? (
            <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '120ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Government &amp; Payroll
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <TextField name="tin" label="TIN" disabled={!canEdit} />
                <TextField name="sss" label="SSS" disabled={!canEdit} />
                <TextField name="philhealth" label="PhilHealth" disabled={!canEdit} />
                <TextField name="pagibig" label="Pag-IBIG" disabled={!canEdit} />
                <TextField name="bankName" label="Bank name" disabled={!canEdit} />
                <TextField name="bankAccountNumber" label="Bank account no." disabled={!canEdit} />
                <SelectField
                  name="salaryType"
                  label="Salary type"
                  options={salaryTypeOptions}
                  placeholder="Select"
                  disabled={!canEdit}
                />
                <TextField name="taxStatus" label="Tax status" disabled={!canEdit} />
                <TextField name="basicSalary" label="Basic salary" inputClassName="tabular-nums" disabled={!canEdit} />
                <TextField name="allowances" label="Allowances" inputClassName="tabular-nums" disabled={!canEdit} />
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border bg-card shadow-soft">
              <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Government and payroll information is restricted to HR and administrators.
              </CardContent>
            </Card>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending || !isDirty}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </Form>
      )}
    </div>
  );
}
