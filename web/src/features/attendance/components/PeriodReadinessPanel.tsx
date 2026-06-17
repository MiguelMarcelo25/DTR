'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, Users, type LucideIcon } from 'lucide-react';
import {
  fetchAttendancePeriodReadiness,
  type AttendancePeriodReadiness,
} from '@/features/attendance/api';
import { MONTHS } from '@/features/attendance/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';

function readNumber(data: AttendancePeriodReadiness, keys: string[]): number {
  for (const key of keys) {
    const direct = data[key];
    const blockers =
      data.blockingIssues && typeof data.blockingIssues === 'object'
        ? (data.blockingIssues as Record<string, unknown>)[key]
        : undefined;
    const nested = data.counts?.[key];
    const value = direct ?? blockers ?? nested;
    if (value === undefined || value === null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function readBoolean(data: AttendancePeriodReadiness, keys: string[]): boolean {
  for (const key of keys) {
    const direct = data[key];
    const blockers =
      data.blockingIssues && typeof data.blockingIssues === 'object'
        ? (data.blockingIssues as Record<string, unknown>)[key]
        : undefined;
    const value = direct ?? blockers;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string' && value.trim()) return value === 'true' || Number(value) > 0;
  }
  return false;
}

function readinessMetrics(data: AttendancePeriodReadiness) {
  const inferredTotal = typeof data.employeeId === 'string' ? 1 : 0;
  const total = readNumber(data, ['totalEmployees', 'employeeCount', 'employeesTotal', 'total']) || inferredTotal;
  const blockingCount =
    readNumber(data, ['pendingCorrections']) +
    readNumber(data, ['missingTimeOuts']) +
    readNumber(data, ['pendingOvertime']) +
    readNumber(data, ['pendingLeave']) +
    (readBoolean(data, ['missingSchedule']) ? 1 : 0);
  const aggregateIncomplete = readNumber(data, ['incompleteDtr', 'missingDtr', 'incomplete', 'missing', 'uncertified']);
  const incomplete = aggregateIncomplete || blockingCount;
  const ready = readNumber(data, ['readyEmployees', 'readyCount', 'readyEmployeesCount']) || (data.ready || data.isReady ? total : 0);
  const conflicts = readNumber(data, ['conflicts', 'conflictCount', 'failed']);

  return { total, ready, incomplete, conflicts };
}

function blockerBadges(data: AttendancePeriodReadiness) {
  return [
    { label: 'Corrections', value: readNumber(data, ['pendingCorrections']) },
    { label: 'Missing time out', value: readNumber(data, ['missingTimeOuts']) },
    { label: 'Overtime', value: readNumber(data, ['pendingOvertime']) },
    { label: 'Leave', value: readNumber(data, ['pendingLeave']) },
    { label: 'Schedule', value: readBoolean(data, ['missingSchedule']) ? 1 : 0 },
  ].filter((item) => item.value > 0);
}

function readinessStatus(data: AttendancePeriodReadiness): string {
  if (typeof data.status === 'string' && data.status.trim()) return data.status;
  if (data.ready || data.isReady) return 'READY';
  return 'REVIEW';
}

function certifiedStatus(data: AttendancePeriodReadiness): string {
  return data.certified || data.dtrCertified ? 'CERTIFIED' : 'NOT_CERTIFIED';
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'success' | 'warning' | 'muted';
}) {
  const iconClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn('h-4 w-4', iconClass)} />
        {label}
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function PeriodReadinessPanel({
  year,
  month,
  title = 'Period Readiness',
  description = 'Attendance checks for the selected period.',
  dtrDays,
  dtrLoading,
  className,
}: {
  year?: number;
  month?: number;
  title?: string;
  description?: string;
  dtrDays?: number;
  dtrLoading?: boolean;
  className?: string;
}) {
  const selected = Boolean(year && month);

  const { data, isError, isLoading } = useQuery({
    queryKey: ['attendance', 'periods', 'readiness', { year, month }],
    queryFn: () => fetchAttendancePeriodReadiness(year!, month!),
    enabled: selected,
    retry: false,
  });

  const monthLabel = selected ? `${MONTHS[(month ?? 1) - 1]} ${year}` : 'No period selected';
  const metrics = data ? readinessMetrics(data) : { total: 0, ready: 0, incomplete: 0, conflicts: 0 };
  const blockers = data ? blockerBadges(data) : [];

  return (
    <Card className={cn('rounded-xl border bg-card shadow-soft', className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          {selected && !isLoading && data && <StatusBadge status={readinessStatus(data)} />}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{monthLabel}</Badge>
          {typeof dtrDays === 'number' || dtrLoading ? (
            <Badge variant="secondary">DTR days: {dtrLoading ? 'Loading' : dtrDays}</Badge>
          ) : null}
          {data && <StatusBadge status={certifiedStatus(data)} />}
        </div>

        {!selected ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Select a start date to check attendance readiness.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="grid overflow-hidden rounded-lg border sm:grid-cols-4 sm:divide-x">
              <Metric label="Employees" value={metrics.total} icon={Users} />
              <Metric label="Ready" value={metrics.ready} icon={CheckCircle2} tone="success" />
              <Metric label="Incomplete" value={metrics.incomplete} icon={Clock} tone="warning" />
              <Metric label="Conflicts" value={metrics.conflicts} icon={AlertTriangle} tone="warning" />
            </div>
            {blockers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockers.map((item) => (
                  <Badge key={item.label} variant="outline">
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{isError ? 'Readiness check failed' : 'Readiness check unavailable'}</p>
              <p className="text-muted-foreground">
                The attendance period status endpoint is not available yet.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
