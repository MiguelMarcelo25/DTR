'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock, Plane, Plus } from 'lucide-react';
import {
  fetchLeaveBalances,
  fetchLeaveRequests,
  type LeaveBalance,
  type LeaveRequest,
} from '@/features/leave/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

export default function LeaveOverviewPage() {
  const balancesQuery = useQuery({
    queryKey: ['leave', 'balances', 'mine'],
    queryFn: () => fetchLeaveBalances(),
  });

  const requestsQuery = useQuery({
    queryKey: ['leave', 'requests', 'mine', 'recent'],
    queryFn: () => fetchLeaveRequests({ page: 1, limit: 5 }),
  });

  const balances = balancesQuery.data ?? [];
  const requests = requestsQuery.data?.items ?? [];

  const totalRemaining = balances.reduce((acc, b) => acc + num(b.remaining), 0);
  const totalEntitled = balances.reduce((acc, b) => acc + num(b.entitled), 0);
  const totalUsed = balances.reduce((acc, b) => acc + num(b.used), 0);
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Leave"
        description="Your leave balances and recent requests."
        action={
          <Button asChild>
            <Link href="/dashboard/leave/request">
              <Plus className="h-4 w-4" />
              Request Leave
            </Link>
          </Button>
        }
      />

      {balancesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Days Remaining" value={totalRemaining} icon={Plane} />
          <StatCard label="Days Entitled" value={totalEntitled} icon={CalendarDays} />
          <StatCard label="Days Used" value={totalUsed} icon={CheckCircle2} />
          <StatCard label="Pending Requests" value={pendingCount} icon={Clock} />
        </div>
      )}

      <div
        className="grid animate-fade-up gap-6 lg:grid-cols-2"
        style={{ animationDelay: '60ms' }}
      >
        <Card>
          <CardHeader>
            <CardTitle>My Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {balancesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : balances.length === 0 ? (
              <EmptyState
                title="No balances yet"
                description="Leave balances appear once they're set up by HR."
              />
            ) : (
              <div className="space-y-3">
                {balances.map((b: LeaveBalance) => (
                  <BalanceRow key={b.id} balance={b} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Requests</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/leave/history">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {requestsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                title="No requests yet"
                description="Submit a leave request to get started."
              />
            ) : (
              <div className="space-y-3">
                {requests.map((r: LeaveRequest) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border-b pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.leaveType?.name ?? 'Leave'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.startDate)} – {formatDate(r.endDate)} · {num(r.days)} day(s)
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BalanceRow({ balance }: { balance: LeaveBalance }) {
  const entitled = num(balance.entitled);
  const used = num(balance.used);
  const remaining = num(balance.remaining);
  const pct = entitled > 0 ? Math.min(100, Math.round((used / entitled) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{balance.leaveType?.name ?? 'Leave type'}</span>
        <span className="text-muted-foreground">
          {remaining} / {entitled} left
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
