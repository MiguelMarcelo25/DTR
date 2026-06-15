'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import {
  listPeriods,
  type PayrollPeriodListItem,
  type PayrollStatus,
} from '@/features/payroll/api';
import { StatusFilter } from '@/features/payroll/components/StatusFilter';

export default function PayrollHistoryPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const isPrivileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PayrollStatus | undefined>();
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'periods', 'history', { page, search: debouncedSearch, status }],
    queryFn: () =>
      listPeriods({ page, limit: 10, search: debouncedSearch || undefined, status }),
    enabled: isPrivileged,
  });

  if (!isPrivileged) {
    router.replace('/dashboard/payroll');
    return null;
  }

  const columns: Column<PayrollPeriodListItem>[] = [
    {
      key: 'name',
      header: 'Period',
      render: (row) => (
        <Link href={`/dashboard/payroll/history/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'range',
      header: 'Date Range',
      render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
    },
    { key: 'payDate', header: 'Pay Date', render: (row) => formatDate(row.payDate) },
    {
      key: 'payrollCount',
      header: 'Employees',
      align: 'right',
      render: (row) => row.payrollCount,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'view',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/payroll/history/${row.id}`}>
            View
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  const toolbar = (
    <>
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search periods…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <StatusFilter
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
    </>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Payroll History"
        description="Browse past payroll periods and their employee payrolls."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/payroll">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<PayrollPeriodListItem>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          getRowKey={(r) => r.id}
          toolbar={toolbar}
          onRowClick={(row) => router.push(`/dashboard/payroll/history/${row.id}`)}
          emptyTitle="No payroll periods"
          emptyDescription="Processed payroll periods will appear here."
        />
      </div>
    </div>
  );
}
