'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { fetchEmployeeDashboard } from '@/features/dashboard/api';
import { punch } from '@/features/attendance/api';
import { formatTime } from '@/features/attendance/utils';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { TimeOutDialog } from './TimeOutDialog';

/** Live wall-clock; updates every second. Inherits its text colour from parent. */
function LiveClock({ big = false }: { big?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-center">
      <p className={cn('font-mono font-bold tabular-nums tracking-tight', big ? 'text-6xl' : 'text-5xl')}>
        {now
          ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '--:--:--'}
      </p>
      <p className="mt-1 text-sm opacity-80">
        {now
          ? now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : ' '}
      </p>
    </div>
  );
}

const titleCase = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function TimeClock({ big = false }: { big?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: fetchEmployeeDashboard,
    retry: false,
    // Refresh periodically + on focus so an open tab re-enables Time In after
    // the business day rolls over (canTimeIn recomputed server-side).
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const [timeOutOpen, setTimeOutOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dashboard', 'employee'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };

  const mutation = useMutation({
    mutationFn: () => punch('time-in'),
    onSuccess: () => {
      toast.success('Timed in');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const timeOutMutation = useMutation({
    mutationFn: (workSummary: string) => punch('time-out', { workSummary }),
    onSuccess: invalidate,
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-card">
        <Skeleton className="h-44 w-full rounded-none" />
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="shadow-soft">
        <CardContent className="space-y-2 p-6 text-center">
          <p className="font-medium">Time clock unavailable</p>
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t linked to an employee record yet, so attendance can&apos;t be tracked.
            Please ask an administrator to link your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tc = data.timeClock;
  const pending = mutation.isPending;
  const btnSize = big ? 'lg' : 'default';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const subline = tc.hasTimedOut
    ? 'Thanks for your hard work today!'
    : tc.hasTimedIn
      ? "You're clocked in — have a great shift."
      : 'Ready to start your day?';

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-card animate-fade-up">
        {/* Greeting + live clock */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-teal-600 px-6 py-7 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-semibold">{greeting}</p>
            <p className="mb-5 text-xs text-white/70">{subline}</p>
            <LiveClock big={big} />
            <div className="mt-4 flex justify-center">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                {titleCase(data.today.status)}
              </span>
            </div>
          </div>
        </div>

        {/* In/out + actions */}
        <CardContent className={cn('space-y-5', big ? 'p-8' : 'p-6')}>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Time In</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">{formatTime(tc.timeIn)}</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Time Out</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">{formatTime(tc.timeOut)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button size={btnSize} disabled={!tc.canTimeIn || pending} onClick={() => mutation.mutate()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
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
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {tc.hasTimedOut
              ? "All done — you've completed your time record for today."
              : tc.hasTimedIn
                ? "You're clocked in. Don't forget to time out when you finish."
                : 'Tap Time In to start your day.'}
          </p>
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
