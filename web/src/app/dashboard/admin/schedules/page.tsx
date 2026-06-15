'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiErrorMessage } from '@/lib/api';
import { scheduleSchema, type ScheduleValues } from '@/schemas/admin.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, NumberField } from '@/components/ui/form';
import { TimeField } from '@/features/admin/components/TimeField';
import { WorkDaysField } from '@/features/admin/components/WorkDaysField';
import { toast } from '@/components/ui/sonner';
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
  type Schedule,
  type SchedulePayload,
} from '@/features/admin/api';

/** Index 0=Sun .. 6=Sat */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const EMPTY_FORM: ScheduleValues = {
  name: '',
  timeIn: '09:00',
  timeOut: '18:00',
  breakMinutes: 60,
  gracePeriodMinutes: 15,
  workDays: [1, 2, 3, 4, 5],
};

function formatWorkDays(days: number[]): string {
  if (!days.length) return '—';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAYS[d] ?? d)
    .join(', ');
}

export default function SchedulesPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: EMPTY_FORM,
  });

  const params = useMemo(() => ({ search: search || undefined }), [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'schedules', params],
    queryFn: () => listSchedules(params),
    placeholderData: (prev) => prev,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: SchedulePayload) =>
      editing ? updateSchedule(editing.id, payload) : createSchedule(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'schedules'] });
      toast.success(editing ? 'Schedule updated.' : 'Schedule created.');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'schedules'] });
      toast.success('Schedule deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            name: editing.name,
            timeIn: editing.timeIn,
            timeOut: editing.timeOut,
            breakMinutes: editing.breakMinutes,
            gracePeriodMinutes: editing.gracePeriodMinutes,
            workDays: [...editing.workDays],
          }
        : EMPTY_FORM,
    );
  }, [dialogOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setDialogOpen(true);
  }

  function onSubmit(values: ScheduleValues) {
    const payload: SchedulePayload = {
      name: values.name.trim(),
      timeIn: values.timeIn,
      timeOut: values.timeOut,
      breakMinutes: Number(values.breakMinutes) || 0,
      gracePeriodMinutes: Number(values.gracePeriodMinutes) || 0,
      workDays: [...values.workDays].sort((a, b) => a - b),
    };
    saveMutation.mutate(payload);
  }

  const columns: Column<Schedule>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'time',
      header: 'Hours',
      className: 'whitespace-nowrap',
      render: (r) => (
        <span className="text-sm">
          {r.timeIn} – {r.timeOut}
        </span>
      ),
    },
    {
      key: 'breakMinutes',
      header: 'Break',
      align: 'right',
      render: (r) => <span className="text-sm">{r.breakMinutes} min</span>,
    },
    {
      key: 'workDays',
      header: 'Work Days',
      render: (r) => <span className="text-sm">{formatWorkDays(r.workDays)}</span>,
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      width: '120px',
      render: (r) => <Badge variant="secondary">{r._count.employees}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '160px',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <ConfirmDialog
            destructive
            title="Delete schedule?"
            description={`This will remove "${r.name}". This action cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={() => deleteMutation.mutateAsync(r.id)}
            trigger={
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Schedules" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="Schedule management is restricted to administrators."
        />
      </div>
    );
  }

  const submitting = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Schedules"
        description="Configure work shifts and assignable schedules."
        action={
          <Button onClick={openCreate} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            New Schedule
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Schedule>
          columns={columns}
          rows={data ?? []}
          loading={isLoading || (isFetching && !data)}
          emptyTitle="No schedules found"
          emptyDescription="Create your first schedule to get started."
          toolbar={
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search schedules…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          }
        />
      </div>

      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Schedule' : 'New Schedule'}
        description="Define shift hours, breaks, and the days this schedule applies."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="schedule-form" disabled={submitting} className="cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <Form id="schedule-form" form={form} onSubmit={onSubmit}>
          <TextField name="name" label="Name" required placeholder="e.g. Standard Day Shift" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField name="timeIn" label="Time in" required />
            <TimeField name="timeOut" label="Time out" required />
            <NumberField name="breakMinutes" label="Break (minutes)" min={0} />
            <NumberField name="gracePeriodMinutes" label="Grace period (minutes)" min={0} />
          </div>
          <WorkDaysField name="workDays" label="Work days" />
        </Form>
      </Modal>
    </div>
  );
}
