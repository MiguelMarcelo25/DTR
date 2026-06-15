'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  listPayslips,
  downloadPayslip,
  saveBlob,
  type PayslipListItem,
} from '@/features/payroll/api';

/** Download button for a single payslip row. */
function DownloadButton({ row }: { row: PayslipListItem }) {
  const download = useMutation({
    mutationFn: () => downloadPayslip(row.id),
    onSuccess: (blob) => {
      saveBlob(blob, `${row.payslipNo}.pdf`);
      toast.success('Payslip downloaded');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={download.isPending}
      onClick={() => download.mutate()}
    >
      {download.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Download
    </Button>
  );
}

/**
 * My Payslips list. Employees see their own released payslips; the API enforces
 * ownership/visibility. Privileged users see all payslips.
 */
export function MyPayslips({ showEmployee = false }: { showEmployee?: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'payslips', { page, search: debouncedSearch }],
    queryFn: () =>
      listPayslips({ page, limit: 10, search: debouncedSearch || undefined }),
  });

  const columns: Column<PayslipListItem>[] = [
    { key: 'payslipNo', header: 'Payslip No' },
    { key: 'periodName', header: 'Period' },
    ...(showEmployee
      ? [
          {
            key: 'employee',
            header: 'Employee',
            render: (row: PayslipListItem) => (
              <div className="flex flex-col">
                <span className="font-medium">{row.employeeName}</span>
                <span className="text-xs text-muted-foreground">{row.employeeNo}</span>
              </div>
            ),
          } as Column<PayslipListItem>,
        ]
      : []),
    {
      key: 'grossPay',
      header: 'Gross',
      align: 'right',
      render: (row) => formatCurrency(row.grossPay),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.netPay)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.releasedAt ? 'RELEASED' : 'PENDING'} />,
    },
    {
      key: 'releasedAt',
      header: 'Released',
      render: (row) => formatDate(row.releasedAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <DownloadButton row={row} />
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder="Search by payslip number…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <DataTable<PayslipListItem>
      columns={columns}
      rows={data?.items ?? []}
      loading={isLoading}
      meta={data?.meta}
      onPageChange={setPage}
      getRowKey={(r) => r.id}
      toolbar={toolbar}
      emptyTitle="No payslips yet"
      emptyDescription="Released payslips will appear here."
    />
  );
}
