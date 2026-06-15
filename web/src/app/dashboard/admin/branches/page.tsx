'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiErrorMessage } from '@/lib/api';
import { branchSchema, type BranchValues } from '@/schemas/admin.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, TextareaField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type Branch,
  type BranchPayload,
} from '@/features/admin/api';

const EMPTY_FORM: BranchValues = { name: '', address: '' };

export default function BranchesPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY_FORM,
  });

  const params = useMemo(() => ({ search: search || undefined }), [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'branches', params],
    queryFn: () => listBranches(params),
    placeholderData: (prev) => prev,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: BranchPayload) =>
      editing ? updateBranch(editing.id, payload) : createBranch(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'branches'] });
      toast.success(editing ? 'Branch updated.' : 'Branch created.');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'branches'] });
      toast.success('Branch deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing ? { name: editing.name, address: editing.address ?? '' } : EMPTY_FORM,
    );
  }, [dialogOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setDialogOpen(true);
  }

  function onSubmit(values: BranchValues) {
    const payload: BranchPayload = {
      name: values.name.trim(),
      address: values.address?.trim() || undefined,
    };
    saveMutation.mutate(payload);
  }

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      render: (r) =>
        r.address ? (
          <span className="text-sm">{r.address}</span>
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
            title="Delete branch?"
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
        <PageHeader title="Branches" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="Branch management is restricted to administrators."
        />
      </div>
    );
  }

  const submitting = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage office and site locations."
        action={
          <Button onClick={openCreate} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            New Branch
          </Button>
        }
      />

      <div className="animate-fade-up">
        <DataTable<Branch>
          columns={columns}
          rows={data ?? []}
          loading={isLoading || (isFetching && !data)}
          emptyTitle="No branches found"
          emptyDescription="Create your first branch to get started."
          toolbar={
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search branches…"
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
        title={editing ? 'Edit Branch' : 'New Branch'}
        description="Branches represent physical office or site locations."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="branch-form" disabled={submitting} className="cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <Form id="branch-form" form={form} onSubmit={onSubmit}>
          <TextField name="name" label="Name" required placeholder="e.g. Head Office" />
          <TextareaField name="address" label="Address" rows={3} placeholder="Street, city, region…" />
        </Form>
      </Modal>
    </div>
  );
}
