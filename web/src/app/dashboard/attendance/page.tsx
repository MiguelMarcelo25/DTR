'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, CalendarDays, History as HistoryIcon, FileClock } from 'lucide-react';
import { fetchHistory, type AttendanceRecord } from '@/features/attendance/api';
import { formatTime, formatMinutes } from '@/features/attendance/utils';
import { TimeClock } from '@/features/attendance/components/TimeClock';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

const recentColumns: Column<AttendanceRecord>[] = [
  { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
  { key: 'timeIn', header: 'In', align: 'right', render: (r) => formatTime(r.timeIn) },
  { key: 'timeOut', header: 'Out', align: 'right', render: (r) => formatTime(r.timeOut) },
  { key: 'worked', header: 'Worked', align: 'right', render: (r) => formatMinutes(r.workedMinutes) },
  { key: 'status', header: 'Status', align: 'right', render: (r) => <StatusBadge status={r.status} /> },
];

export default function AttendanceOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'history', { recent: true }],
    queryFn: () => fetchHistory({ page: 1, limit: 5 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Clock in and out, and review your recent activity."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/attendance/time-clock">
              <Clock className="h-4 w-4" />
              Time Clock
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TimeClock />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div
            className="grid animate-fade-up gap-3 sm:grid-cols-3"
            style={{ animationDelay: '60ms' }}
          >
            <Button asChild variant="outline" className="h-auto justify-start py-4">
              <Link href="/dashboard/attendance/history">
                <HistoryIcon className="h-4 w-4" />
                History
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-4">
              <Link href="/dashboard/attendance/monthly-dtr">
                <CalendarDays className="h-4 w-4" />
                Monthly DTR
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-4">
              <Link href="/dashboard/attendance/corrections">
                <FileClock className="h-4 w-4" />
                Corrections
              </Link>
            </Button>
          </div>

          <Card className="animate-fade-up shadow-soft" style={{ animationDelay: '120ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/attendance/history">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={recentColumns}
                rows={data?.items ?? []}
                loading={isLoading}
                emptyTitle="No attendance yet"
                emptyDescription="Your recent punches will appear here once you clock in."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
