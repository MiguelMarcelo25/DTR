'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn, initials } from '@/lib/utils';
import { COMPANY_NAME } from '@/lib/constants';
import { fetchActivity } from '@/features/attendance/api';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function ActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'activity'],
    queryFn: () => fetchActivity(40),
    refetchInterval: 45_000,
  });

  return (
    <Card className="shadow-soft animate-fade-up" style={{ animationDelay: '60ms' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Today&apos;s Activity
        </CardTitle>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          in {COMPANY_NAME}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet today"
            description="As teammates clock in and out, their time and daily particulars show up here."
          />
        ) : (
          <ol className="relative space-y-5 border-l border-border pl-6">
            {data.map((item) => {
              const isOut = item.type === 'OUT';
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5">
                    <Avatar className="h-6 w-6 ring-2 ring-card">
                      {item.employee.photoUrl && <AvatarImage src={item.employee.photoUrl} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {initials(item.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                  </span>

                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm leading-tight">
                    <span className="font-semibold tabular-nums text-primary">{formatTime(item.time)}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium">{item.employee.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        isOut
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {isOut ? 'Time out' : 'Time in'}
                    </span>
                  </p>

                  {isOut && item.summary ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{item.summary}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {isOut ? 'Clocked out for the day' : 'Started the day'}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
