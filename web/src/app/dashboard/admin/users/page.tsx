'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail, Plus, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiErrorMessage } from '@/lib/api';
import { createUserSchema, type CreateUserValues } from '@/schemas/admin.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Form, TextField, SelectField, type SelectOption } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatDateTime } from '@/lib/utils';
import type { RoleName } from '@/types';
import {
  createUser,
  listRoles,
  listUsers,
  updateUser,
  userDisplayName,
  type CreateUserPayload,
  type User,
} from '@/features/admin/api';

const PAGE_SIZE = 20;

const FALLBACK_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'];

const EMPTY_CREATE: CreateUserValues = {
  email: '',
  password: '',
  role: 'EMPLOYEE',
  employeeId: '',
};

export default function UsersPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');
  const canCreate = hasRole('SUPER_ADMIN'); // only the Super Admin creates login accounts
  const canView = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);

  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: EMPTY_CREATE,
  });

  const params = useMemo(
    () => ({ page, limit: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => listUsers(params),
    placeholderData: (prev) => prev,
    enabled: canView,
  });

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: listRoles,
    enabled: canView,
  });
  const roles: RoleName[] = rolesQuery.data?.map((r) => r.name) ?? FALLBACK_ROLES;

  const roleOptions: SelectOption[] = useMemo(
    () => roles.map((role) => ({ label: role, value: role })),
    [roles],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User created.');
      setCreateOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, isActive, role }: { id: string; isActive?: boolean; role?: RoleName }) =>
      updateUser(id, { isActive, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User updated.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  useEffect(() => {
    if (createOpen) form.reset(EMPTY_CREATE);
  }, [createOpen, form]);

  function openCreate() {
    setCreateOpen(true);
  }

  function onSubmitCreate(values: CreateUserValues) {
    const payload: CreateUserPayload = {
      email: values.email.trim(),
      password: values.password,
      role: values.role as RoleName,
      employeeId: values.employeeId?.trim() || undefined,
    };
    createMutation.mutate(payload);
  }

  const columns: Column<User>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.email}</p>
          <p className="truncate text-xs text-muted-foreground">{userDisplayName(r)}</p>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Employee',
      render: (r) =>
        r.employee ? (
          <span className="text-sm">{r.employee.name ?? r.employee.employeeNo}</span>
        ) : (
          <Badge variant="outline">No employee</Badge>
        ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles.length > 0 ? (
            r.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      className: 'whitespace-nowrap',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.lastLoginAt ? formatDateTime(r.lastLoginAt) : 'Never'}
        </span>
      ),
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
      width: '280px',
      render: (r) =>
        canManage ? (
          <div className="flex items-center justify-end gap-2">
            <Select
              value={r.roles[0] ?? ''}
              onValueChange={(v) => updateMutation.mutate({ id: r.id, role: v as RoleName })}
            >
              <SelectTrigger className="w-36 cursor-pointer">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={r.isActive ? 'outline' : 'default'}
              size="sm"
              className="cursor-pointer"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: r.id, isActive: !r.isActive })}
            >
              {r.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        ) : null,
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Management" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="User management is restricted to administrators."
        />
      </div>
    );
  }

  const submitting = createMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage login accounts, roles and access."
        action={
          canCreate ? (
            <Button onClick={openCreate} className="cursor-pointer">
              <Plus className="h-4 w-4" />
              New User
            </Button>
          ) : undefined
        }
      />

      <div className="animate-fade-up">
        <DataTable<User>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading || (isFetching && !data)}
          meta={data?.meta}
          onPageChange={setPage}
          emptyTitle="No users found"
          emptyDescription="Try adjusting your search."
          toolbar={
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Email, name…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          }
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New User"
        description="Create a login account and assign an initial role."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={submitting} className="cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </>
        }
      >
        <Form id="user-form" form={form} onSubmit={onSubmitCreate}>
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            placeholder="you@company.com"
            autoComplete="off"
            leftIcon={<Mail />}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            required
            description="Minimum 8 characters."
            autoComplete="new-password"
            leftIcon={<Lock />}
          />
          <SelectField name="role" label="Role" required options={roleOptions} placeholder="Select role" />
          <TextField
            name="employeeId"
            label="Employee ID"
            description="Optional — link this account to an employee record."
            placeholder="Link to an employee record"
          />
        </Form>
      </Modal>
    </div>
  );
}
