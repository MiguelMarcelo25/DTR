'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiErrorMessage } from '@/lib/api';
import {
  positionSchema,
  POSITION_DEPARTMENT_NONE as NONE,
  type PositionValues,
} from '@/schemas/admin.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, SelectField, type SelectOption } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import {
  createPosition,
  deletePosition,
  listDepartments,
  listPositions,
  updatePosition,
  type Position,
  type PositionPayload,
} from '@/features/admin/api';

const EMPTY_FORM: PositionValues = { title: '', level: '', departmentId: NONE };

export default function PositionsPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  const form = useForm<PositionValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: EMPTY_FORM,
  });

  const params = useMemo(() => ({ search: search || undefined }), [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'positions', params],
    queryFn: () => listPositions(params),
    placeholderData: (prev) => prev,
    enabled: canManage,
  });

  const departmentsQuery = useQuery({
    queryKey: ['admin', 'departments', 'options'],
    queryFn: () => listDepartments(),
    enabled: canManage,
  });
  const departments = departmentsQuery.data ?? [];

  const departmentOptions: SelectOption[] = useMemo(
    () => [
      { label: 'No department', value: NONE },
      ...departments.map((d) => ({ label: d.name, value: d.id })),
    ],
    [departments],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: PositionPayload) =>
      editing ? updatePosition(editing.id, payload) : createPosition(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'positions'] });
      toast.success(editing ? 'Position updated.' : 'Position created.');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePosition(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'positions'] });
      toast.success('Position deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? { title: editing.title, level: editing.level ?? '', departmentId: editing.departmentId ?? NONE }
        : EMPTY_FORM,
    );
  }, [dialogOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Position) {
    setEditing(p);
    setDialogOpen(true);
  }

  function onSubmit(values: PositionValues) {
    const payload: PositionPayload = {
      title: values.title.trim(),
      level: values.level?.trim() || undefined,
      departmentId: values.departmentId === NONE ? undefined : values.departmentId || undefined,
    };
    saveMutation.mutate(payload);
  }

  const columns: Column<Position>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: 'level',
      header: 'Level',
      render: (r) =>
        r.level ? <span className="text-sm">{r.level}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (r) =>
        r.department ? (
          <span className="text-sm">{r.department.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      width: '120px',
      render: (r) => <span>{r._count.employees}</span>,
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
            title="Delete position?"
            description={`This will remove "${r.title}". This action cannot be undone.`}
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
        <PageHeader title="Positions" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="Position management is restricted to administrators."
        />
      </div>
    );
  }

  const submitting = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Positions"
        description="Define job positions and titles across departments."
        action={
          <Button onClick={openCreate} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            New Position
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Position>
          columns={columns}
          rows={data ?? []}
          loading={isLoading || (isFetching && !data)}
          emptyTitle="No positions found"
          emptyDescription="Create your first position to get started."
          toolbar={
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search positions…"
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
        title={editing ? 'Edit Position' : 'New Position'}
        description="Positions define job titles and levels, optionally tied to a department."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="position-form" disabled={submitting} className="cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <Form id="position-form" form={form} onSubmit={onSubmit}>
          <TextField name="title" label="Title" required placeholder="e.g. Software Engineer" />
          <TextField name="level" label="Level" placeholder="e.g. Senior" />
          <SelectField
            name="departmentId"
            label="Department"
            options={departmentOptions}
            placeholder="No department"
          />
        </Form>
      </Modal>
    </div>
  );
}
