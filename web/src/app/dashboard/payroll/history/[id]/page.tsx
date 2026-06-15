'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wallet, Users, Banknote, Receipt } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getPeriod, type EmployeePayroll } from '@/features/payroll/api';
import { PeriodActions } from '@/features/payroll/components/PeriodActions';

export default function PayrollPeriodDetailPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isPrivileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payroll', 'period', id],
    queryFn: () => getPeriod(id),
    enabled: isPrivileged && !!id,
  });

  if (!isPrivileged) {
    router.replace('/dashboard/payroll');
    return null;
  }

  const totals = (data?.payrolls ?? []).reduce(
    (acc, p) => {
      acc.gross += p.grossPay;
      acc.deductions += p.totalDeductions;
      acc.net += p.netPay;
      return acc;
    },
    { gross: 0, deductions: 0, net: 0 },
  );

  const columns: Column<EmployeePayroll>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.employeeName}</span>
          <span className="text-xs text-muted-foreground">{row.employeeNo}</span>
        </div>
      ),
    },
    { key: 'daysWorked', header: 'Days', align: 'right', render: (row) => row.daysWorked },
    { key: 'absentDays', header: 'Absent', align: 'right', render: (row) => row.absentDays },
    { key: 'basicPay', header: 'Basic', align: 'right', render: (row) => formatCurrency(row.basicPay) },
    { key: 'grossPay', header: 'Gross', align: 'right', render: (row) => formatCurrency(row.grossPay) },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (row) => formatCurrency(row.totalDeductions),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.netPay)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'payslip',
      header: 'Payslip',
      render: (row) =>
        row.payslip ? (
          <span className="text-xs text-muted-foreground">{row.payslip.payslipNo}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={data?.name ?? 'Payroll Period'}
        description={
          data
            ? `${formatDate(data.startDate)} – ${formatDate(data.endDate)}${
                data.payDate ? ` · Pay date ${formatDate(data.payDate)}` : ''
              }`
            : undefined
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/payroll/history">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <EmptyState
          title="Payroll period not found"
          description="It may have been removed or you don't have access."
        />
      ) : (
        <div className="space-y-6">
          <Card className="animate-fade-up">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={data.status} />
                <span className="text-sm text-muted-foreground">
                  {data.payrolls.length} employee payroll(s)
                </span>
              </div>
              <PeriodActions
                id={data.id}
                status={data.status}
                invalidateKeys={[
                  ['payroll', 'period', id],
                  ['payroll', 'periods'],
                ]}
              />
            </CardContent>
          </Card>

          <div
            className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animationDelay: '60ms' }}
          >
            <StatCard label="Employees" value={data.payrolls.length} icon={Users} />
            <StatCard label="Gross Total" value={formatCurrency(totals.gross)} icon={Banknote} />
            <StatCard
              label="Deductions"
              value={formatCurrency(totals.deductions)}
              icon={Receipt}
            />
            <StatCard label="Net Total" value={formatCurrency(totals.net)} icon={Wallet} />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <DataTable<EmployeePayroll>
              columns={columns}
              rows={data.payrolls}
              getRowKey={(row) => row.id}
              emptyTitle="No employee payrolls"
              emptyDescription="This period has no computed payrolls."
            />
          </div>
        </div>
      )}
    </div>
  );
}
