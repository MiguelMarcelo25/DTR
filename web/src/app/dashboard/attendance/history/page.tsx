'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHistory, type AttendanceRecord } from '@/features/attendance/api';
import { formatTime, formatMinutes } from '@/features/attendance/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

const columns: Column<AttendanceRecord>[] = [
  { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
  { key: 'timeIn', header: 'In', align: 'right', render: (r) => formatTime(r.timeIn) },
  { key: 'timeOut', header: 'Out', align: 'right', render: (r) => formatTime(r.timeOut) },
  { key: 'lateMinutes', header: 'Late', align: 'right', render: (r) => formatMinutes(r.lateMinutes) },
  { key: 'undertimeMinutes', header: 'Undertime', align: 'right', render: (r) => formatMinutes(r.undertimeMinutes) },
  { key: 'workedMinutes', header: 'Worked', align: 'right', render: (r) => formatMinutes(r.workedMinutes) },
  { key: 'status', header: 'Status', align: 'right', render: (r) => <StatusBadge status={r.status} /> },
];

export default function AttendanceHistoryPage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'history', { page, from, to }],
    queryFn: () =>
      fetchHistory({
        page,
        limit: 20,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  function reset() {
    setFrom('');
    setTo('');
    setPage(1);
  }

  const toolbar = (
    <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="from">From</Label>
        <DatePicker
          id="from"
          value={from}
          onChange={(v) => {
            setFrom(v);
            setPage(1);
          }}
          placeholder="Pick a date"
          className="w-full sm:w-44"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to">To</Label>
        <DatePicker
          id="to"
          value={to}
          onChange={(v) => {
            setTo(v);
            setPage(1);
          }}
          placeholder="Pick a date"
          className="w-full sm:w-44"
        />
      </div>
      {(from || to) && (
        <Button variant="ghost" onClick={reset}>
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance History" description="Your daily attendance records." />

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={toolbar}
        emptyTitle="No attendance records"
        emptyDescription="No records were found for the selected range."
      />
    </div>
  );
}
