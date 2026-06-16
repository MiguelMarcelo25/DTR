'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, CalendarCheck, CircleCheck, Plane } from 'lucide-react';
import { fetchEmployeeDashboard } from '@/features/dashboard/api';
import { TimeClock } from '@/features/attendance/components/TimeClock';
import { ActivityFeed } from '@/features/attendance/components/ActivityFeed';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';

export default function AttendanceOverviewPage() {
  const { data } = useQuery({ queryKey: ['dashboard', 'employee'], queryFn: fetchEmployeeDashboard });

  const a = data?.attendanceSummary;
  const present = a?.present ?? 0;
  const late = a?.late ?? 0;
  const onTime = present + late > 0 ? Math.round((present / (present + late)) * 100) : 100;
  const leaveRemaining = data?.leaveBalanceSummary?.reduce((sum, b) => sum + b.remaining, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Clock in and out, and see what your team is working on today."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/attendance/time-clock">
              <Clock className="h-4 w-4" />
              Full Time Clock
            </Link>
          </Button>
        }
      />

      {/* Clock in/out  +  Today's Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TimeClock />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* This month at a glance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'On-time rate', value: `${onTime}%`, icon: CircleCheck, hint: 'this month' },
          { label: 'Late', value: late, icon: Clock, hint: 'this month' },
          { label: 'Present days', value: present, icon: CalendarCheck, hint: 'this month' },
          { label: 'Leave balance', value: leaveRemaining, icon: Plane, hint: 'days remaining' },
        ].map((s, i) => (
          <div key={s.label} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <StatCard label={s.label} value={s.value} icon={s.icon} hint={s.hint} />
          </div>
        ))}
      </div>
    </div>
  );
}
