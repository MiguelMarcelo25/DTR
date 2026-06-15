'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Coffee, Play, Loader2 } from 'lucide-react';
import { fetchEmployeeDashboard } from '@/features/dashboard/api';
import { punch } from '@/features/attendance/api';
import { formatTime } from '@/features/attendance/utils';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { TimeOutDialog } from './TimeOutDialog';

type PunchAction = 'time-in' | 'time-out' | 'break-in' | 'break-out';

/** Live wall-clock; updates every second. */
function LiveClock({ big = false }: { big?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-center">
      <p className={cn('font-mono font-bold tabular-nums tracking-tight', big ? 'text-6xl' : 'text-4xl')}>
        {now
          ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '--:--:--'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {now
          ? now.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : ' '}
      </p>
    </div>
  );
}

export function TimeClock({ big = false }: { big?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: fetchEmployeeDashboard,
  });

  const [timeOutOpen, setTimeOutOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dashboard', 'employee'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };

  const mutation = useMutation({
    mutationFn: (action: Exclude<PunchAction, 'time-out'>) => punch(action),
    onSuccess: (_res, action) => {
      const label = {
        'time-in': 'Timed in',
        'break-in': 'Break started',
        'break-out': 'Break ended',
      } as const;
      toast.success(label[action]);
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Time-out goes through the daily-summary dialog; success drives the thank-you step.
  const timeOutMutation = useMutation({
    mutationFn: (workSummary: string) => punch('time-out', { workSummary }),
    onSuccess: invalidate,
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (isLoading || !data) {
    return (
      <Card className="shadow-soft">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="mx-auto h-16 w-64" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const tc = data.timeClock;
  const pending = mutation.isPending;
  const activeAction = mutation.variables as PunchAction | undefined;
  const onBreak = false; // break state not exposed; buttons stay enabled per timeIn/out
  const btnSize = big ? 'lg' : 'default';

  /** Icon for a button: spinner while that specific action is in flight. */
  const icon = (action: PunchAction, Fallback: typeof LogIn) =>
    pending && activeAction === action ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Fallback className="h-4 w-4" />
    );

  return (
    <>
    <Card className="shadow-soft animate-fade-up">
      <CardContent className={cn('space-y-6', big ? 'p-8' : 'p-6')}>
        <LiveClock big={big} />

        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={data.today.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Time In</p>
            <p className="font-medium tabular-nums">{formatTime(tc.timeIn)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Time Out</p>
            <p className="font-medium tabular-nums">{formatTime(tc.timeOut)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size={btnSize}
            disabled={!tc.canTimeIn || pending}
            onClick={() => mutation.mutate('time-in')}
          >
            {icon('time-in', LogIn)}
            Time In
          </Button>
          <Button
            size={btnSize}
            variant="outline"
            disabled={!tc.canTimeOut || pending}
            onClick={() => setTimeOutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Time Out
          </Button>
          <Button
            size={btnSize}
            variant="secondary"
            disabled={!tc.hasTimedIn || tc.hasTimedOut || pending}
            onClick={() => mutation.mutate('break-in')}
          >
            {icon('break-in', Coffee)}
            Break In
          </Button>
          <Button
            size={btnSize}
            variant="secondary"
            disabled={!tc.hasTimedIn || tc.hasTimedOut || pending || onBreak}
            onClick={() => mutation.mutate('break-out')}
          >
            {icon('break-out', Play)}
            Break Out
          </Button>
        </div>
      </CardContent>
    </Card>

    <TimeOutDialog
      open={timeOutOpen}
      onOpenChange={setTimeOutOpen}
      onSubmit={(workSummary) => timeOutMutation.mutateAsync(workSummary)}
    />
    </>
  );
}
