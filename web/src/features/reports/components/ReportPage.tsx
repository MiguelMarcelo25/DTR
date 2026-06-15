'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PRIVILEGED } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ReportView } from '@/features/reports/components/ReportView';
import type { ReportType } from '@/features/reports/api';

interface ReportPageProps {
  type: ReportType;
  title: string;
  description: string;
  showSearch?: boolean;
}

/**
 * Privileged-only report page shell: header with a back link to the hub, an
 * access guard for non-privileged users, and the generic <ReportView>.
 */
export function ReportPage({ type, title, description, showSearch = true }: ReportPageProps) {
  const { hasRole } = useAuth();

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href="/dashboard/reports">
              <ArrowLeft className="h-4 w-4" />
              All reports
            </Link>
          </Button>
        }
      />

      {hasRole(...PRIVILEGED) ? (
        <ReportView type={type} showSearch={showSearch} />
      ) : (
        <div className="animate-fade-up">
          <EmptyState
            icon={ShieldAlert}
            title="Access restricted"
            description="You do not have permission to view reports."
          />
        </div>
      )}
    </div>
  );
}
