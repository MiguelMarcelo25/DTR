'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarCheck, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { fetchCalendarIntegrationStatus } from '@/features/appointments/api';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';

function count(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function HealthMetric({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'destructive';
}) {
  const toneClass =
    tone === 'destructive'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        {label}
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function CalendarIntegrationHealthPanel() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['appointments', 'calendar-integration', 'status'],
    queryFn: fetchCalendarIntegrationStatus,
    retry: false,
  });
  const headerStatus = data
    ? data.configured
      ? 'CONFIGURED'
      : 'NOT_CONFIGURED'
    : 'UNAVAILABLE';

  return (
    <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Calendar Health
        </CardTitle>
        {isLoading ? <Skeleton className="h-6 w-24" /> : <StatusBadge status={headerStatus} />}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Auth: {data.authMode ?? 'Not set'}</Badge>
              <Badge variant="outline" className="max-w-full truncate">
                Calendar: {data.calendarId ?? 'Not set'}
              </Badge>
              {data.lastSyncAt && <Badge variant="secondary">Synced: {formatDateTime(data.lastSyncAt)}</Badge>}
            </div>
            <div className="grid overflow-hidden rounded-lg border sm:grid-cols-3 sm:divide-x">
              <HealthMetric label="Queued" value={count(data.queuedCount)} icon={Clock} tone="warning" />
              <HealthMetric label="Failed" value={count(data.failedCount)} icon={XCircle} tone="destructive" />
              <HealthMetric label="Conflicts" value={count(data.conflictCount)} icon={AlertTriangle} tone="warning" />
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{isError ? 'Calendar status unavailable' : 'Calendar status not configured'}</p>
              <p className="text-muted-foreground">
                The status endpoint is not available yet. Appointment scheduling is still accessible.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
