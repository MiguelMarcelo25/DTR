'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import {
  listSlots,
  deleteSlot,
  listAppointments,
  employeeName,
  type AppointmentSlot,
  type Appointment,
} from '@/features/appointments/api';
import { SlotFormDialog } from '@/features/appointments/components/SlotFormDialog';
import { AppointmentRowActions } from '@/features/appointments/components/AppointmentRowActions';

export default function ManageSlotsPage() {
  const { hasRole, loading } = useAuth();
  const router = useRouter();
  const privileged = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  useEffect(() => {
    if (!loading && !privileged) router.replace('/dashboard/appointments');
  }, [loading, privileged, router]);

  if (!loading && !privileged) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Manage Slots & Requests"
        description="Publish bookable slots and review appointment requests."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/appointments">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="requests" className="animate-fade-up space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="slots">Slots</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="slots">
          <SlotsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Requests (pending appointments for review)
// ─────────────────────────────────────────────────────────────

function RequestsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'requests', { page, search: debouncedSearch }],
    queryFn: () =>
      listAppointments({
        page,
        limit: 10,
        status: 'PENDING',
        search: debouncedSearch || undefined,
        sort: 'scheduledDate',
        order: 'asc',
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
    { key: 'employee', header: 'Employee', render: (r) => employeeName(r) },
    { key: 'purpose', header: 'Purpose', render: (r) => r.purpose },
    {
      key: 'slot',
      header: 'Slot',
      render: (r) =>
        r.slot ? (
          <span className="text-sm">
            {r.slot.startTime}–{r.slot.endTime}
          </span>
        ) : (
          <span className="text-muted-foreground">Custom</span>
        ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '56px',
      render: (r) => (
        <div className="flex justify-end">
          <AppointmentRowActions appointment={r} />
        </div>
      ),
    },
  ];

  const toolbar = (
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
  );

  return (
    <DataTable<Appointment>
      columns={columns}
      rows={data?.items ?? []}
      loading={isLoading}
      meta={data?.meta}
      onPageChange={setPage}
      toolbar={toolbar}
      emptyTitle="No pending requests"
      emptyDescription="Appointment requests awaiting review will appear here."
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Slots (create / edit / delete)
// ─────────────────────────────────────────────────────────────

function SlotsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment-slots', 'list', { page, search: debouncedSearch }],
    queryFn: () =>
      listSlots({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        sort: 'date',
        order: 'desc',
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSlot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment-slots'] });
      toast.success('Slot deleted');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const columns: Column<AppointmentSlot>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    {
      key: 'time',
      header: 'Time',
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.startTime}–{r.endTime}
        </span>
      ),
    },
    { key: 'capacity', header: 'Capacity', align: 'right', render: (r) => r.capacity },
    {
      key: 'location',
      header: 'Location',
      render: (r) => r.location ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'purpose',
      header: 'Purpose',
      render: (r) => r.purpose ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '104px',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <SlotFormDialog
            slot={r}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Edit slot">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete slot?"
            description="Slots with active appointments cannot be deleted."
            confirmLabel="Delete"
            destructive
            onConfirm={() => remove.mutateAsync(r.id)}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Delete slot">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  const toolbar = (
    <>
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by location or purpose…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>
      <SlotFormDialog
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            New slot
          </Button>
        }
      />
    </>
  );

  return (
    <DataTable<AppointmentSlot>
      columns={columns}
      rows={data?.items ?? []}
      loading={isLoading}
      meta={data?.meta}
      onPageChange={setPage}
      toolbar={toolbar}
      emptyTitle="No slots yet"
      emptyDescription="Create a slot so employees can book appointments."
    />
  );
}
