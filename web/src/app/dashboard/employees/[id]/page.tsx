'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, Building2, CalendarDays, MapPin, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, initials } from '@/lib/utils';
import { getEmployee } from '@/features/employees/api';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';
import { Field } from '@/features/employees/components/Field';
import { fullName } from '@/features/employees/components/fullName';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id),
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader
          title="Employee Detail"
          action={
            <Button variant="outline" asChild>
              <Link href="/dashboard/employees">
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </Link>
            </Button>
          }
        />
      </div>

      {isLoading || !employee ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary header */}
          <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={employee.profile?.photoUrl ?? undefined} alt={fullName(employee.profile)} />
                <AvatarFallback>{initials(fullName(employee.profile))}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{fullName(employee.profile)}</h2>
                  <StatusBadge status={employee.employmentStatus} />
                  {employee.archivedAt && <StatusBadge status="INACTIVE" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {employee.employeeNo}
                  {employee.position?.title ? ` · ${employee.position.title}` : ''}
                  {employee.department?.name ? ` · ${employee.department.name}` : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
            <EmployeeTabs employeeId={id} />
          </div>

          {/* Overview stats */}
          <div
            className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animationDelay: '120ms' }}
          >
            <StatCard label="Employment Type" value={employee.employmentType.replace(/_/g, ' ')} icon={Briefcase} />
            <StatCard label="Department" value={employee.department?.name ?? '—'} icon={Building2} />
            <StatCard label="Branch" value={employee.branch?.name ?? '—'} icon={MapPin} />
            <StatCard label="Date Hired" value={formatDate(employee.dateHired)} icon={CalendarDays} />
          </div>

          <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '180ms' }}>
            <CardHeader>
              <CardTitle>Employment Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Position" value={employee.position?.title} />
              <Field label="Rank" value={employee.rank} />
              <Field label="Schedule" value={employee.schedule?.name} />
              <Field
                label="Supervisor"
                value={
                  employee.supervisor ? (
                    <Link
                      href={`/dashboard/employees/${employee.supervisor.id}`}
                      className="text-primary hover:underline"
                    >
                      {fullName(employee.supervisor.profile)} ({employee.supervisor.employeeNo})
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <Field label="Regularization Date" value={formatDate(employee.regularizationDate)} />
              <Field
                label="Account"
                value={
                  employee.userId ? (
                    <span className="inline-flex items-center gap-1">
                      <UserCog className="h-4 w-4" /> Linked
                    </span>
                  ) : (
                    'No login'
                  )
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
