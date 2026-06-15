'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Lock, Building2 } from 'lucide-react';
import { loginSchema, type LoginValues } from '@/schemas/auth.schema';
import { useAuth } from '@/providers/AuthProvider';
import { homePathForRoles } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Form, TextField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user) router.replace(homePathForRoles(user.roles));
  }, [user, loading, router]);

  async function onSubmit(values: LoginValues) {
    try {
      const u = await login(values.email, values.password);
      toast.success('Welcome back!');
      router.replace(homePathForRoles(u.roles));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Login failed'));
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="space-y-8">
      {/* Mobile brand mark (brand panel is hidden on small screens) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="font-display font-bold">HRMS</span>
      </div>

      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your HR workspace to continue.</p>
      </div>

      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          leftIcon={<Mail />}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Password</span>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <TextField
            control={form.control}
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            leftIcon={<Lock />}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        New client?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
        Demo · <span className="font-medium text-foreground">superadmin@hrms.local</span> / Password123!
      </p>
    </div>
  );
}
