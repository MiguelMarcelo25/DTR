'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { changePassword } from '@/features/profile/api';
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/profile.schema';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, TextField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

export default function ChangePasswordPage() {
  const router = useRouter();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully.');
      form.reset();
      router.push('/dashboard/profile');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not change password')),
  });

  const submitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Password"
        description="Update the password you use to sign in."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/profile">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-lg animate-fade-up rounded-xl border bg-card shadow-soft">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Choose a strong password of at least 8 characters that you do not use elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={(v) => mutation.mutate(v)} className="space-y-4">
            <TextField
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              leftIcon={<Lock />}
            />
            <TextField
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock />}
            />
            <TextField
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock />}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/profile">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Change password
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
