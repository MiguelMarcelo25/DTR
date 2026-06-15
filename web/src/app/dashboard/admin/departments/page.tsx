'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiErrorMessage } from '@/lib/api';
import { departmentSchema, type DepartmentValues } from '@/schemas/admin.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, TextareaField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type Department,
  type DepartmentPayload,
} from '@/features/admin/api';

const EMPTY_FORM: DepartmentValues = { name: '', code: '', description: '' };

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY_FORM,
  });

  const params = useMemo(() => ({ search: search || undefined }), [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'departments', params],
    queryFn: () => listDepartments(params),
    placeholderData: (prev) => prev,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: DepartmentPayload) =>
      editing ? updateDepartment(editing.id, payload) : createDepartment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success(editing ? 'Department updated.' : 'Department created.');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success('Department deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Sync the form whenever the dialog opens for create/edit.
  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? { name: editing.name, code: editing.code ?? '', description: editing.description ?? '' }
        : EMPTY_FORM,
    );
  }, [dialogOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setDialogOpen(true);
  }

  function onSubmit(values: DepartmentValues) {
    const payload: DepartmentPayload = {
      name: values.name.trim(),
      code: values.code?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };
    saveMutation.mutate(payload);
  }

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (r) =>
        r.code ? <Badge variant="secondary">{r.code}</Badge> : <span className="text-muted-foreground">—</span>,
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
            title="Delete department?"
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
        <PageHeader title="Departments" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="Department management is restricted to administrators."
        />
      </div>
    );
  }

  const submitting = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Create and manage organizational departments."
        action={
          <Button onClick={openCreate} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            New Department
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Department>
          columns={columns}
          rows={data ?? []}
          loading={isLoading || (isFetching && !data)}
          emptyTitle="No departments found"
          emptyDescription="Create your first department to get started."
          toolbar={
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search departments…"
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
        title={editing ? 'Edit Department' : 'New Department'}
        description="Departments group employees and positions across the organization."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="department-form" disabled={submitting} className="cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <Form id="department-form" form={form} onSubmit={onSubmit}>
          <TextField name="name" label="Name" required placeholder="e.g. Engineering" />
          <TextField name="code" label="Code" placeholder="e.g. ENG" />
          <TextareaField name="description" label="Description" rows={3} placeholder="Optional summary of this department." />
        </Form>
      </Modal>
    </div>
  );
}
