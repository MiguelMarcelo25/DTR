'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useMyEmployeeId } from '@/features/profile/useMyEmployeeId';
import {
  createUpdateRequest,
  fetchProfile,
  updateProfile,
  type EmployeeProfile,
} from '@/features/profile/api';
import {
  personalInfoSchema,
  sensitiveRequestSchema,
  type PersonalInfoValues,
  type SensitiveRequestValues,
  GENDER_VALUES,
  CIVIL_STATUS_VALUES,
  SENSITIVE_SECTIONS,
} from '@/schemas/profile.schema';
import { getApiErrorMessage } from '@/lib/api';
import { civilStatusLabel, genderLabel } from '@/features/profile/helpers';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  TextField,
  TextareaField,
  SelectField,
  DateField,
  type SelectOption,
} from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

const GENDER_OPTIONS: SelectOption[] = GENDER_VALUES.map((g) => ({ value: g, label: genderLabel(g) }));
const CIVIL_STATUS_OPTIONS: SelectOption[] = CIVIL_STATUS_VALUES.map((c) => ({
  value: c,
  label: civilStatusLabel(c),
}));
const SECTION_OPTIONS: SelectOption[] = SENSITIVE_SECTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));

export default function EditProfilePage() {
  const { employeeId, isLoading: idLoading, isError: idError } = useMyEmployeeId();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'profile'],
    queryFn: () => fetchProfile(employeeId as string),
    enabled: !!employeeId,
  });

  if (idLoading || (employeeId && isLoading)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Profile" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (idError || !employeeId) {
    return (
      <div>
        <PageHeader title="Edit Profile" />
        <EmptyState
          title="No employee record"
          description="Your account is not linked to an employee record. Please contact HR."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Profile"
        description="Update your personal details. Sensitive changes require HR approval."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/profile">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="sensitive">Sensitive Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoForm employeeId={employeeId} profile={profile} />
        </TabsContent>
        <TabsContent value="sensitive">
          <SensitiveChangeForm employeeId={employeeId} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Personal info — direct write for privileged users; update request
// for plain employees (API restricts direct PUT to HR/admins).
// ─────────────────────────────────────────────────────────────

function PersonalInfoForm({
  employeeId,
  profile,
}: {
  employeeId: string;
  profile?: EmployeeProfile | null;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { hasRole } = useAuth();
  const canDirectEdit = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      dateOfBirth: '',
      gender: '',
      civilStatus: '',
      nationality: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName ?? '',
        middleName: profile.middleName ?? '',
        lastName: profile.lastName ?? '',
        suffix: profile.suffix ?? '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
        gender: profile.gender ?? '',
        civilStatus: profile.civilStatus ?? '',
        nationality: profile.nationality ?? '',
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: (values: PersonalInfoValues) => {
      const parsed = personalInfoSchema.parse(values);
      const changes: Record<string, unknown> = {
        firstName: parsed.firstName,
        middleName: parsed.middleName,
        lastName: parsed.lastName,
        suffix: parsed.suffix,
        dateOfBirth: parsed.dateOfBirth,
        gender: parsed.gender,
        civilStatus: parsed.civilStatus,
        nationality: parsed.nationality,
      };
      if (canDirectEdit) {
        return updateProfile(employeeId, changes).then(() => 'updated' as const);
      }
      return createUpdateRequest({ section: 'personal', changes }).then(() => 'requested' as const);
    },
    onSuccess: (result) => {
      if (result === 'updated') {
        toast.success('Profile updated.');
        qc.invalidateQueries({ queryKey: ['profile', employeeId] });
        router.push('/dashboard/profile');
      } else {
        toast.success('Update request submitted for HR approval.');
        qc.invalidateQueries({ queryKey: ['profile-update-requests'] });
        router.push('/dashboard/profile/update-requests');
      }
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save changes')),
  });

  const submitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        {!canDirectEdit && (
          <p className="text-sm text-muted-foreground">
            Your changes will be submitted to HR for approval.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form form={form} onSubmit={(v) => mutation.mutate(v)} className="grid gap-4 sm:grid-cols-2">
          <TextField name="firstName" label="First name" required />
          <TextField name="middleName" label="Middle name" />
          <TextField name="lastName" label="Last name" required />
          <TextField name="suffix" label="Suffix" placeholder="Jr., Sr., III" />
          <DateField name="dateOfBirth" label="Date of birth" />
          <SelectField
            name="gender"
            label="Gender"
            placeholder="Select gender"
            options={GENDER_OPTIONS}
          />
          <SelectField
            name="civilStatus"
            label="Civil status"
            placeholder="Select civil status"
            options={CIVIL_STATUS_OPTIONS}
          />
          <TextField name="nationality" label="Nationality" />

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/profile">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {canDirectEdit ? 'Save changes' : 'Submit for approval'}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Sensitive changes — always routed through profile-update-requests.
// ─────────────────────────────────────────────────────────────

type SensitiveSectionKey = 'personal' | 'government' | 'bank';

const SENSITIVE_FIELDS: Record<
  SensitiveSectionKey,
  { name: keyof SensitiveRequestValues; label: string; placeholder?: string; textarea?: boolean }[]
> = {
  personal: [
    { name: 'contactNumber', label: 'Contact number' },
    { name: 'currentAddress', label: 'Current address', textarea: true },
    { name: 'permanentAddress', label: 'Permanent address', textarea: true },
  ],
  government: [
    { name: 'tin', label: 'TIN' },
    { name: 'sss', label: 'SSS' },
    { name: 'philhealth', label: 'PhilHealth' },
    { name: 'pagibig', label: 'Pag-IBIG' },
  ],
  bank: [
    { name: 'bankName', label: 'Bank name' },
    { name: 'bankAccountNumber', label: 'Bank account number' },
  ],
};

function SensitiveChangeForm({
  employeeId,
  profile,
}: {
  employeeId: string;
  profile?: EmployeeProfile | null;
}) {
  const qc = useQueryClient();
  const router = useRouter();

  const form = useForm<SensitiveRequestValues>({
    resolver: zodResolver(sensitiveRequestSchema),
    defaultValues: { section: 'personal' },
  });

  const section = (form.watch('section') ?? 'personal') as SensitiveSectionKey;
  const fields = SENSITIVE_FIELDS[section];

  const mutation = useMutation({
    mutationFn: (values: SensitiveRequestValues) => {
      const changes: Record<string, unknown> = {};
      for (const f of SENSITIVE_FIELDS[values.section]) {
        const raw = values[f.name];
        const v = typeof raw === 'string' ? raw.trim() : raw;
        if (v !== undefined && v !== '') changes[f.name as string] = v;
      }
      if (Object.keys(changes).length === 0) {
        throw new Error('Enter at least one value to request a change');
      }
      return createUpdateRequest({ section: values.section, changes });
    },
    onSuccess: () => {
      toast.success('Update request submitted for HR approval.');
      qc.invalidateQueries({ queryKey: ['profile-update-requests'] });
      router.push('/dashboard/profile/update-requests');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not submit request')),
  });

  const submitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-warning" />
          Request Sensitive Change
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Address, contact, government IDs and bank details require HR review. Leave fields blank to
          keep them unchanged.
        </p>
      </CardHeader>
      <CardContent>
        <Form form={form} onSubmit={(v) => mutation.mutate(v)} className="space-y-4">
          <SelectField
            name="section"
            label="Section"
            options={SECTION_OPTIONS}
            className="sm:max-w-sm"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const current =
                profile && profile[f.name as keyof EmployeeProfile] != null
                  ? `current: ${String(profile[f.name as keyof EmployeeProfile])}`
                  : undefined;
              return f.textarea ? (
                <TextareaField
                  key={f.name as string}
                  name={f.name as string}
                  label={f.label}
                  description={current}
                  className="sm:col-span-2"
                />
              ) : (
                <TextField
                  key={f.name as string}
                  name={f.name as string}
                  label={f.label}
                  description={current}
                />
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/profile">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
