'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, ScrollText, Search, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { AUDIT_MODULES, listAuditLogs, type AuditLog } from '@/features/admin/api';
import { AuditLogDetailDialog } from '@/features/admin/components/AuditLogDetailDialog';

const ALL = '__all__';
const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [module, setModule] = useState<string>(ALL);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const search = useDebounce(searchInput, 400);
  const debouncedAction = useDebounce(action, 400);

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort: 'createdAt' as const,
      order: 'desc' as const,
      search: search || undefined,
      module: module === ALL ? undefined : module,
      action: debouncedAction || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, search, module, debouncedAction, from, to],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
    placeholderData: (prev) => prev,
    enabled: isAdmin,
  });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function resetFilters() {
    setSearchInput('');
    setModule(ALL);
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const hasFilters = !!(searchInput || module !== ALL || action || from || to);

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'When',
      className: 'whitespace-nowrap',
      render: (r) => <span className="text-sm">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => <Badge variant="secondary">{r.action}</Badge>,
    },
    {
      key: 'module',
      header: 'Module',
      render: (r) => <StatusBadge status={r.module} />,
    },
    {
      key: 'user',
      header: 'User',
      render: (r) => <span className="text-sm">{r.user?.email ?? '—'}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="line-clamp-1 max-w-[280px] text-sm text-muted-foreground">
          {r.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      className: 'whitespace-nowrap',
      render: (r) => <span className="text-xs text-muted-foreground">{r.ipAddress ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '96px',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(r.id);
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Logs" />
        <EmptyState
          icon={ScrollText}
          title="Not authorized"
          description="You do not have access to audit logs."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track every privileged action across the system."
      />

      <Card className="animate-fade-up rounded-xl border bg-card shadow-soft">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-search">Search description</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="audit-search"
                placeholder="Search…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Module</Label>
            <Select
              value={module}
              onValueChange={(v) => {
                setModule(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="All modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All modules</SelectItem>
                {AUDIT_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Input
              id="audit-action"
              placeholder="e.g. LEAVE_APPROVED"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From</Label>
            <DatePicker
              id="audit-from"
              value={from}
              onChange={(v) => {
                setFrom(v);
                setPage(1);
              }}
              placeholder="Pick a date"
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To</Label>
            <DatePicker
              id="audit-to"
              value={to}
              onChange={(v) => {
                setTo(v);
                setPage(1);
              }}
              placeholder="Pick a date"
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            {hasFilters && (
              <Button variant="outline" onClick={resetFilters} className="w-full cursor-pointer sm:w-auto">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <DataTable<AuditLog>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading || (isFetching && !data)}
          meta={data?.meta}
          onPageChange={setPage}
          onRowClick={(r) => openDetail(r.id)}
          emptyTitle="No audit logs found"
          emptyDescription="Try adjusting your filters or date range."
        />
      </div>

      <AuditLogDetailDialog id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <ScrollText className="mr-1 h-3.5 w-3.5" />
          Audit entries are written automatically by the system.
        </div>
      )}
    </div>
  );
}
