'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMonthlyDtr, type MonthlyDtrDay } from '@/features/attendance/api';
import { PeriodReadinessPanel } from '@/features/attendance/components/PeriodReadinessPanel';
import { formatTime, formatMinutes, weekday, MONTHS } from '@/features/attendance/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarCheck, Clock, AlarmClock, Timer } from 'lucide-react';

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const columns: Column<MonthlyDtrDay>[] = [
  {
    key: 'day',
    header: 'Day',
    render: (r) => (
      <span className="font-medium">
        {r.day} <span className="text-muted-foreground">{weekday(r.date)}</span>
      </span>
    ),
  },
  { key: 'timeIn', header: 'In', align: 'right', render: (r) => formatTime(r.attendance?.timeIn ?? null) },
  { key: 'timeOut', header: 'Out', align: 'right', render: (r) => formatTime(r.attendance?.timeOut ?? null) },
  { key: 'late', header: 'Late', align: 'right', render: (r) => formatMinutes(r.attendance?.lateMinutes) },
  { key: 'undertime', header: 'Undertime', align: 'right', render: (r) => formatMinutes(r.attendance?.undertimeMinutes) },
  { key: 'worked', header: 'Worked', align: 'right', render: (r) => formatMinutes(r.attendance?.workedMinutes) },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (r) => {
      if (r.attendance) return <StatusBadge status={r.attendance.status} />;
      return <DerivedStatus value={r.derivedStatus} />;
    },
  },
];

/** Label shown for a day with no punch, based on the server-derived reason. */
const DERIVED_LABEL: Record<string, string> = {
  ABSENT: 'Absent',
  ON_LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
  REST_DAY: 'Rest Day',
};

function DerivedStatus({ value }: { value?: MonthlyDtrDay['derivedStatus'] }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  // Absent is the only actionable/alarming state → red badge.
  if (value === 'ABSENT') return <StatusBadge status="ABSENT" />;
  if (value === 'ON_LEAVE') return <StatusBadge status="ON_LEAVE" />;
  // Holiday / Rest Day are informational → muted label.
  return <span className="text-sm text-muted-foreground">{DERIVED_LABEL[value] ?? value}</span>;
}

export default function MonthlyDtrPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'monthly-dtr', { year, month }],
    queryFn: () => fetchMonthlyDtr(year, month),
  });

  const totals = useMemo(() => {
    const days = data?.days ?? [];
    let present = 0;
    let late = 0;
    let worked = 0;
    let lateMins = 0;
    for (const d of days) {
      const a = d.attendance;
      if (!a) continue;
      if (a.status === 'PRESENT') present += 1;
      if (a.status === 'LATE') late += 1;
      worked += a.workedMinutes;
      lateMins += a.lateMinutes;
    }
    return { present, late, worked, lateMins };
  }, [data]);

  const rows = data?.days ?? [];

  const toolbar = (
    <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <Label>Month</Label>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Year</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly DTR" description="Day-by-day daily time record for the selected month." />

      <div className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present" value={totals.present} icon={CalendarCheck} />
        <StatCard label="Late" value={totals.late} icon={AlarmClock} />
        <StatCard label="Total Worked" value={formatMinutes(totals.worked)} icon={Timer} />
        <StatCard label="Total Late" value={formatMinutes(totals.lateMins)} icon={Clock} />
      </div>

      <PeriodReadinessPanel
        year={year}
        month={month}
        title="DTR Period Status"
        description="Certification and period readiness for this monthly DTR."
        dtrDays={rows.length}
        dtrLoading={isLoading}
        className="animate-fade-up"
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        getRowKey={(r) => String(r.day)}
        toolbar={toolbar}
        emptyTitle="No data"
        emptyDescription="No attendance was recorded for this month."
      />
    </div>
  );
}
