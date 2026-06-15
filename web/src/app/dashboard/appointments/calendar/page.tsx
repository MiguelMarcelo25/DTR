'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowLeft, Plus } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { getCalendar, employeeName, type Appointment } from '@/features/appointments/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Local YYYY-MM-DD key for an appointment's scheduled date. */
function dayKey(value: string): string {
  return value.slice(0, 10);
}

export default function AppointmentCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'calendar', { from: toISO(monthStart), to: toISO(monthEnd) }],
    queryFn: () => getCalendar({ from: toISO(monthStart), to: toISO(monthEnd) }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of data ?? []) {
      const key = dayKey(a.scheduledDate);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [data]);

  // Build the grid: leading blanks for the first weekday, then each day of month.
  const cells = useMemo(() => {
    const lead = monthStart.getDay();
    const days = monthEnd.getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [monthStart, monthEnd, year, month]);

  const todayKey = toISO(new Date());
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const sortedList = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) =>
        a.scheduledDate === b.scheduledDate
          ? a.scheduledTime.localeCompare(b.scheduledTime)
          : a.scheduledDate.localeCompare(b.scheduledDate),
      ),
    [data],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Appointment Calendar"
        description="View your appointments across the month."
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/appointments">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/appointments/book">
                <Plus className="h-4 w-4" />
                Book
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{monthLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {w}
                </div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`b-${i}`} className="min-h-24 bg-background" />;
                const key = toISO(date);
                const items = byDay.get(key) ?? [];
                const isToday = key === todayKey;
                return (
                  <div key={key} className="min-h-24 bg-background p-1.5 transition-colors hover:bg-muted/40">
                    <div
                      className={cn(
                        'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        isToday && 'bg-primary font-semibold text-primary-foreground',
                      )}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary"
                          title={`${a.scheduledTime} · ${a.purpose}`}
                        >
                          {a.scheduledTime} {a.purpose}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="px-1.5 text-[11px] text-muted-foreground">
                          +{items.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className="animate-fade-up rounded-xl border bg-card shadow-soft"
        style={{ animationDelay: '80ms' }}
      >
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedList.length === 0 ? (
            <EmptyState
              title="No appointments this month"
              description="Nothing scheduled between the start and end of this month."
            />
          ) : (
            <div className="divide-y">
              {sortedList.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.purpose}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.scheduledDate)} · {a.scheduledTime} · {employeeName(a)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
