'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listAppointments,
  employeeName,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/api';

const ALL = 'ALL';
const STATUSES: AppointmentStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'RESCHEDULED',
  'APPROVED',
  'PENDING',
];

/** Yesterday — appointments scheduled strictly before today count as "past". */
function pastBoundaryISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function AppointmentHistoryPage() {
  const { hasRole } = useAuth();
  const privileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(ALL);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'history', { page, search: debouncedSearch, status }],
    queryFn: () =>
      listAppointments({
        page,
        limit: 10,
        to: pastBoundaryISO(),
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : (status as AppointmentStatus),
        sort: 'scheduledDate',
        order: 'desc',
      }),
  });

  const columns: Column<Appointment>[] = [
    {
      key: 'scheduledDate',
      header: 'Date',
      render: (r) => (
        <div className="whitespace-nowrap">
          <div className="font-medium">{formatDate(r.scheduledDate)}</div>
          <div className="text-xs text-muted-foreground">{r.scheduledTime}</div>
        </div>
      ),
    },
    { key: 'purpose', header: 'Purpose', render: (r) => r.purpose },
    ...(privileged
      ? [
          {
            key: 'employee',
            header: 'Employee',
            render: (r: Appointment) => employeeName(r),
          } as Column<Appointment>,
        ]
      : []),
    {
      key: 'note',
      header: 'Note',
      render: (r) =>
        r.note ? (
          <span className="text-sm text-muted-foreground">{r.note}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const toolbar = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by purpose…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Appointment History"
        description="Past appointments scheduled before today."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/appointments">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Appointment>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          toolbar={toolbar}
          emptyTitle="No past appointments"
          emptyDescription="Your completed and past appointments will appear here."
        />
      </div>
    </div>
  );
}
