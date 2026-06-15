'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  Clock,
  CalendarX,
  Plane,
  CalendarClock,
  Wallet,
  Bell,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/providers/AuthProvider';
import { api, getApiErrorMessage } from '@/lib/api';
import {
  fetchAdminDashboard,
  fetchEmployeeDashboard,
  fetchHrDashboard,
} from '@/features/dashboard/api';
import { punch } from '@/features/attendance/api';
import { TimeOutDialog } from '@/features/attendance/components/TimeOutDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from '@/components/ui/sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';

// Recharts is loaded on demand (kept out of the initial dashboard bundle).
const DashboardCharts = dynamic(() => import('@/features/dashboard/components/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-[336px]" />
      <Skeleton className="h-[336px]" />
    </div>
  ),
});

export default function DashboardPage() {
  const { hasRole } = useAuth();
  if (hasRole('SUPER_ADMIN', 'ADMIN')) return <AdminDashboardView />;
  if (hasRole('HR')) return <HrDashboardView />;
  return <EmployeeDashboardView />;
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

// ── Employee ──
function EmployeeDashboardView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: fetchEmployeeDashboard,
  });

  const [timeOutOpen, setTimeOutOpen] = useState(false);

  const clock = useMutation({
    mutationFn: (action: 'time-in') => api.post(`/attendance/${action}`),
    onSuccess: () => {
      toast.success('Timed in');
      qc.invalidateQueries({ queryKey: ['dashboard', 'employee'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const timeOutMut = useMutation({
    mutationFn: (workSummary: string) => punch('time-out', { workSummary }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', 'employee'] }),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="My Dashboard" description="Your attendance, leave, and pay at a glance." />
      {isLoading || !data ? (
        <GridSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today" value={data.today.status} icon={Clock} />
            <StatCard label="Present (month)" value={data.attendanceSummary.present} icon={UserCheck} />
            <StatCard label="Late (month)" value={data.attendanceSummary.late} icon={Clock} />
            <StatCard label="Upcoming appointments" value={data.appointmentSummary.upcoming} icon={CalendarClock} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Time Clock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  In: {data.timeClock.timeIn ? formatDateTime(data.timeClock.timeIn) : '—'}
                  <br />
                  Out: {data.timeClock.timeOut ? formatDateTime(data.timeClock.timeOut) : '—'}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={!data.timeClock.canTimeIn || clock.isPending}
                    onClick={() => clock.mutate('time-in')}
                  >
                    {clock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Time In
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!data.timeClock.canTimeOut}
                    onClick={() => setTimeOutOpen(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Time Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <TimeOutDialog
              open={timeOutOpen}
              onOpenChange={setTimeOutOpen}
              onSubmit={(workSummary) => timeOutMut.mutateAsync(workSummary)}
            />

            <Card>
              <CardHeader>
                <CardTitle>Leave Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.leaveBalanceSummary.length === 0 && (
                  <p className="text-sm text-muted-foreground">No balances.</p>
                )}
                {data.leaveBalanceSummary.map((b) => (
                  <div key={b.leaveTypeId} className="flex justify-between text-sm">
                    <span>{b.leaveType}</span>
                    <span className="font-medium">{b.remaining} left</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latest Payslip</CardTitle>
              </CardHeader>
              <CardContent>
                {data.latestPayslip ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">{data.latestPayslip.period}</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.latestPayslip.netPay)}</p>
                    <StatusBadge status={data.latestPayslip.status} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payslip yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Completion · {data.profileCompletion.percentage}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${data.profileCompletion.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Admin ──
function AdminDashboardView() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: fetchAdminDashboard });

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Organization-wide overview." />
      {isLoading || !data ? (
        <GridSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Employees" value={data.totals.totalEmployees} icon={Users} />
            <StatCard label="Active" value={data.totals.activeEmployees} icon={UserCheck} />
            <StatCard label="Late Today" value={data.totals.lateToday} icon={Clock} />
            <StatCard label="Absent Today" value={data.totals.absentToday} icon={CalendarX} />
            <StatCard label="Pending Leave" value={data.totals.pendingLeaveRequests} icon={Plane} />
            <StatCard label="Pending Corrections" value={data.totals.pendingAttendanceCorrections} icon={Clock} />
            <StatCard label="Pending Appointments" value={data.totals.pendingAppointments} icon={CalendarClock} />
            <StatCard label="Payroll" value={data.payroll.current?.status ?? '—'} icon={Wallet} />
          </div>

          <DashboardCharts charts={data.charts} />

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                  <div>
                    <span className="font-medium">{a.action}</span>{' '}
                    <span className="text-muted-foreground">{a.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── HR ──
function HrDashboardView() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', 'hr'], queryFn: fetchHrDashboard });

  return (
    <div>
      <PageHeader title="HR Dashboard" description="People operations overview." />
      {isLoading || !data ? (
        <GridSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Pending Leave" value={data.pendingLeaveRequests} icon={Plane} />
          <StatCard label="Pending Corrections" value={data.pendingAttendanceCorrections} icon={Clock} />
          <StatCard label="Profile Update Requests" value={data.pendingProfileUpdateRequests} icon={Bell} />
          <StatCard label="New Hires (month)" value={data.newHiresThisMonth} icon={UserCheck} />
          <StatCard
            label="Expiring Documents"
            value={data.documentExpirations.total}
            icon={CalendarX}
            hint={`within ${data.documentExpirations.withinDays} days`}
          />
        </div>
      )}
    </div>
  );
}
