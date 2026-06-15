'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, History, BarChart3, Search } from 'lucide-react';
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
import { PeriodActions } from '@/features/payroll/components/PeriodActions';
import { StatusFilter } from '@/features/payroll/components/StatusFilter';
import { MyPayslips } from '@/features/payroll/components/MyPayslips';

const PERIODS_KEY = ['payroll', 'periods'];

function PrivilegedPayrollView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PayrollStatus | undefined>();
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: [...PERIODS_KEY, { page, search: debouncedSearch, status }],
    queryFn: () =>
      listPeriods({ page, limit: 10, search: debouncedSearch || undefined, status }),
  });

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
    {
      key: 'payDate',
      header: 'Pay Date',
      render: (row) => formatDate(row.payDate),
    },
    {
      key: 'payrollCount',
      header: 'Employees',
      align: 'right',
      render: (row) => row.payrollCount,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <PeriodActions id={row.id} status={row.status} invalidateKeys={[PERIODS_KEY]} />
        </div>
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
        title="Payroll"
        description="Process payroll periods and manage payslips."
        action={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/payroll/reports">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/payroll/history">
                <History className="h-4 w-4" />
                History
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/payroll/process">
                <Plus className="h-4 w-4" />
                Process Payroll
              </Link>
            </Button>
          </>
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
          emptyTitle="No payroll periods"
          emptyDescription="Process a payroll period to get started."
        />
      </div>
    </div>
  );
}

function EmployeePayrollView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="My Payslips" description="View and download your released payslips." />
      <div className="animate-fade-up">
        <MyPayslips />
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const { hasRole } = useAuth();
  if (hasRole('SUPER_ADMIN', 'ADMIN', 'HR')) return <PrivilegedPayrollView />;
  return <EmployeePayrollView />;
}
