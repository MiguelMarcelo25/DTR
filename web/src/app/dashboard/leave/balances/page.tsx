'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import {
  adjustLeaveBalance,
  employeeLabel,
  fetchLeaveBalances,
  type LeaveBalance,
} from '@/features/leave/api';
import { AdjustBalanceDialog } from '@/features/leave/components/AdjustBalanceDialog';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { PRIVILEGED } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

const CURRENT_YEAR = new Date().getFullYear();

type Row = LeaveBalance & Record<string, unknown>;

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

export default function LeaveBalancesPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const privileged = hasRole(...PRIVILEGED);

  const [year, setYear] = useState(CURRENT_YEAR);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leave', 'balances', 'list', year],
    queryFn: () => fetchLeaveBalances({ year }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: { leaveTypeId: string; year: number; entitled: number; used: number };
    }) => adjustLeaveBalance(employeeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Balance adjusted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const columns: Column<Row>[] = [];

  if (privileged) {
    columns.push({
      key: 'employee',
      header: 'Employee',
      render: (b) => <span className="font-medium">{employeeLabel(b.employee)}</span>,
    });
  }

  columns.push(
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (b) => (
        <span className="flex items-center gap-2">
          {b.leaveType?.name ?? '—'}
          {b.leaveType && <StatusBadge status={b.leaveType.isPaid ? 'ACTIVE' : 'INACTIVE'} />}
        </span>
      ),
    },
    { key: 'year', header: 'Year', align: 'right', render: (b) => b.year },
    { key: 'entitled', header: 'Entitled', align: 'right', render: (b) => num(b.entitled) },
    { key: 'used', header: 'Used', align: 'right', render: (b) => num(b.used) },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (b) => <span className="font-semibold">{num(b.remaining)}</span>,
    },
    { key: 'updated', header: 'Updated', render: (b) => formatDate(b.updatedAt) },
  );

  if (privileged) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <AdjustBalanceDialog
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Adjust
            </Button>
          }
          title="Adjust leave balance"
          description={`${employeeLabel(b.employee)} · ${b.leaveType?.name ?? ''} · ${b.year}`}
          leaveTypeId={b.leaveTypeId}
          year={b.year}
          defaultEntitled={num(b.entitled)}
          defaultUsed={num(b.used)}
          onSubmit={async (payload) => {
            await adjustMutation.mutateAsync({ employeeId: b.employeeId, payload });
          }}
        />
      ),
    });
  }

  const toolbar = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Year</span>
      <Input
        type="number"
        value={year}
        min={2000}
        max={3000}
        onChange={(e) => setYear(Number(e.target.value) || CURRENT_YEAR)}
        className="w-28"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Leave Balances"
        description={
          privileged ? 'All employee leave balances.' : 'Your leave balances by type.'
        }
      />

      <div className="animate-fade-up">
        <DataTable<Row>
          columns={columns}
          rows={(data ?? []) as Row[]}
          loading={isLoading || isFetching}
          toolbar={toolbar}
          emptyTitle="No balances found"
          emptyDescription={
            privileged
              ? 'No leave balances exist for this year yet.'
              : "You don't have any leave balances for this year."
          }
          getRowKey={(b) => b.id}
        />
      </div>
    </div>
  );
}
