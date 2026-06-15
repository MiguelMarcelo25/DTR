'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { MyPayslips } from '@/features/payroll/components/MyPayslips';

export default function PayslipsPage() {
  const { hasRole } = useAuth();
  const isPrivileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={isPrivileged ? 'Payslips' : 'My Payslips'}
        description={
          isPrivileged
            ? 'Browse and download employee payslips.'
            : 'View and download your released payslips.'
        }
        action={
          isPrivileged ? (
            <Button variant="outline" asChild>
              <Link href="/dashboard/payroll">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="animate-fade-up">
        <MyPayslips showEmployee={isPrivileged} />
      </div>
    </div>
  );
}
