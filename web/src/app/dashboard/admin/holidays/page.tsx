'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, DateField, SelectField } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
  HOLIDAY_TYPES,
  HOLIDAY_TYPE_LABELS,
  type Holiday,
  type HolidayPayload,
  type HolidayType,
} from '@/features/holidays/api';

// ─────────────────────────────────────────────────────────────
// Form schema — mirrors HolidayPayload (date, name, type).
// Co-located here since the holidays feature owns its validation.
// ─────────────────────────────────────────────────────────────

const holidaySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['REGULAR', 'SPECIAL_NON_WORKING', 'SPECIAL_WORKING']),
});

type HolidayValues = z.infer<typeof holidaySchema>;

const EMPTY_FORM: HolidayValues = { date: '', name: '', type: 'REGULAR' };

const TYPE_OPTIONS = HOLIDAY_TYPES.map((t) => ({
  value: t,
  label: HOLIDAY_TYPE_LABELS[t],
}));

const TYPE_VARIANT: Record<HolidayType, 'default' | 'warning' | 'secondary'> = {
  REGULAR: 'default',
  SPECIAL_NON_WORKING: 'warning',
  SPECIAL_WORKING: 'secondary',
};

const ALL_YEARS = 'ALL';

/** Recent years for the filter: current year + a few back/forward. */
function buildYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 5; y--) years.push(y);
  return years;
}

export default function HolidaysPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  const yearOptions = useMemo(buildYearOptions, []);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  const form = useForm<HolidayValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: EMPTY_FORM,
  });

  const yearParam = year === ALL_YEARS ? undefined : Number(year);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => listHolidays({ year: yearParam }),
    placeholderData: (prev) => prev,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: HolidayPayload) =>
      editing ? updateHoliday(editing.id, payload) : createHoliday(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success(editing ? 'Holiday updated.' : 'Holiday created.');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Sync the form whenever the dialog opens for create/edit.
  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? { date: editing.date.slice(0, 10), name: editing.name, type: editing.type }
        : EMPTY_FORM,
    );
  }, [dialogOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(h: Holiday) {
    setEditing(h);
    setDialogOpen(true);
  }

  function onSubmit(values: HolidayValues) {
    const payload: HolidayPayload = {
      date: values.date,
      name: values.name.trim(),
      type: values.type,
    };
    saveMutation.mutate(payload);
  }

  const columns: Column<Holiday>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '160px',
      render: (r) => <span className="font-medium">{formatDate(r.date)}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (r) => r.name,
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant={TYPE_VARIANT[r.type]}>{HOLIDAY_TYPE_LABELS[r.type]}</Badge>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            width: '160px',
            render: (r: Holiday) => (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="cursor-pointer">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <ConfirmDialog
                  destructive
                  title="Delete holiday?"
                  description={`This will remove "${r.name}". This action cannot be undone.`}
                  confirmLabel="Delete"
                  onConfirm={() => deleteMutation.mutateAsync(r.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  }
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  const submitting = saveMutation.isPending;

  const toolbar = (
    <div className="w-full sm:w-auto">
      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_YEARS}>All years</SelectItem>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Holidays"
        description="Manage the company holiday calendar used across attendance and payroll."
        action={
          canManage ? (
            <Button onClick={openCreate} className="cursor-pointer">
              <Plus className="h-4 w-4" />
              New Holiday
            </Button>
          ) : undefined
        }
      />

      <div className="animate-fade-up">
        <DataTable<Holiday>
          columns={columns}
          rows={data ?? []}
          loading={isLoading || (isFetching && !data)}
          toolbar={toolbar}
          emptyTitle="No holidays found"
          emptyDescription={
            canManage
              ? 'Add your first holiday to build the calendar.'
              : 'No holidays have been added for this period.'
          }
        />
      </div>

      {canManage ? (
        <Modal
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editing ? 'Edit Holiday' : 'New Holiday'}
          description="Holidays drive non-working day handling across the organization."
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" form="holiday-form" disabled={submitting} className="cursor-pointer">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create'}
              </Button>
            </>
          }
        >
          <Form id="holiday-form" form={form} onSubmit={onSubmit}>
            <DateField name="date" label="Date" required />
            <TextField name="name" label="Name" required placeholder="e.g. Independence Day" />
            <SelectField name="type" label="Type" required options={TYPE_OPTIONS} placeholder="Select type" />
          </Form>
        </Modal>
      ) : null}
    </div>
  );
}
