'use client';

import Link from 'next/link';
import {
  CalendarClock,
  ClipboardList,
  Plane,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

interface ReportLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const REPORTS: ReportLink[] = [
  {
    href: '/dashboard/reports/attendance',
    title: 'Attendance',
    description: 'Daily attendance with late, undertime, and worked hours.',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/reports/leave',
    title: 'Leave',
    description: 'Leave requests by type, status, and total days.',
    icon: Plane,
  },
  {
    href: '/dashboard/reports/appointments',
    title: 'Appointments',
    description: 'Scheduled appointments and their outcomes.',
    icon: CalendarClock,
  },
  {
    href: '/dashboard/reports/payroll',
    title: 'Payroll',
    description: 'Payroll totals per period and employee.',
    icon: Wallet,
  },
  {
    href: '/dashboard/reports/employees',
    title: 'Employee Masterlist',
    description: 'Full roster with employment and contact details.',
    icon: Users,
  },
];

export default function ReportsHubPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate, filter, and export HR reports."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r, i) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group animate-fade-up cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="h-full rounded-xl border bg-card shadow-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-card">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold transition-colors group-hover:text-primary">{r.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
