'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Banknote, Receipt, Wallet, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  getReports,
  exportReports,
  saveBlob,
  type PayrollStatus,
  type ReportFilters,
  type PayrollReport,
} from '@/features/payroll/api';
import { StatusFilter } from '@/features/payroll/components/StatusFilter';

type PeriodRow = PayrollReport['byPeriod'][number] & Record<string, unknown>;

export default function PayrollReportsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const isPrivileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [status, setStatus] = useState<PayrollStatus | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters: ReportFilters = {
    status,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'reports', filters],
    queryFn: () => getReports(filters),
    enabled: isPrivileged,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportReports(filters),
    onSuccess: (blob) => {
      saveBlob(blob, 'payroll-report.csv');
      toast.success('Report exported');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!isPrivileged) {
    router.replace('/dashboard/payroll');
    return null;
  }

  const columns: Column<PeriodRow>[] = [
    {
      key: 'periodName',
      header: 'Period',
      render: (row) =>
        row.periodId ? (
          <Link
            href={`/dashboard/payroll/history/${row.periodId}`}
            className="font-medium hover:underline"
          >
            {row.periodName ?? '—'}
          </Link>
        ) : (
          (row.periodName ?? '—')
        ),
    },
    {
      key: 'range',
      header: 'Date Range',
      render: (row) =>
        row.startDate && row.endDate
          ? `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`
          : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'payrollCount', header: 'Employees', align: 'right', render: (row) => row.payrollCount },
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
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Payroll Reports"
        description="Aggregated payroll totals with CSV export."
        action={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/payroll">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
          </>
        }
      />

      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="report-status">Status</Label>
            <StatusFilter value={status} onChange={setStatus} className="w-full sm:w-[180px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              className="w-full sm:w-[180px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="date"
              className="w-full sm:w-[180px]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(status || startDate || endDate) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatus(undefined);
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      <div
        className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: '60ms' }}
      >
        <StatCard
          label="Payroll Count"
          value={data?.totals.payrollCount ?? 0}
          icon={FileSpreadsheet}
        />
        <StatCard
          label="Gross Pay"
          value={formatCurrency(data?.totals.grossPay ?? 0)}
          icon={Banknote}
        />
        <StatCard
          label="Total Deductions"
          value={formatCurrency(data?.totals.totalDeductions ?? 0)}
          icon={Receipt}
        />
        <StatCard label="Net Pay" value={formatCurrency(data?.totals.netPay ?? 0)} icon={Wallet} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <DataTable
          columns={columns}
          rows={(data?.byPeriod ?? []) as PeriodRow[]}
          loading={isLoading}
          getRowKey={(row) => row.periodId}
          emptyTitle="No payroll data"
          emptyDescription="Adjust the filters or process a payroll period."
        />
      </div>
    </div>
  );
}
