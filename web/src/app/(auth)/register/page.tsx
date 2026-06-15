'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Lock, User, Building2, Phone } from 'lucide-react';
import { registerSchema, type RegisterValues } from '@/schemas/auth.schema';
import { useAuth } from '@/providers/AuthProvider';
import { homePathForRoles } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Form, TextField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', company: '', phone: '', password: '', confirm: '' },
  });

  useEffect(() => {
    if (!loading && user) router.replace(homePathForRoles(user.roles));
  }, [user, loading, router]);

  async function onSubmit(values: RegisterValues) {
    try {
      const u = await register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        company: values.company || undefined,
        phone: values.phone || undefined,
      });
      toast.success('Welcome! Your account is ready.');
      router.replace(homePathForRoles(u.roles));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create your account'));
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="font-display font-bold">HRMS Support</span>
      </div>

      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Sign up to submit and track support requests.</p>
      </div>

      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <TextField control={form.control} name="fullName" label="Full name" placeholder="Jane Dela Cruz" leftIcon={<User />} />
        <TextField control={form.control} name="email" label="Email" type="email" placeholder="you@company.com" autoComplete="email" leftIcon={<Mail />} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="company" label="Company (optional)" placeholder="Acme Corp" leftIcon={<Building2 />} />
          <TextField control={form.control} name="phone" label="Phone (optional)" placeholder="0917…" leftIcon={<Phone />} />
        </div>
        <TextField control={form.control} name="password" label="Password" type="password" placeholder="••••••••" autoComplete="new-password" leftIcon={<Lock />} />
        <TextField control={form.control} name="confirm" label="Confirm password" type="password" placeholder="••••••••" autoComplete="new-password" leftIcon={<Lock />} />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
