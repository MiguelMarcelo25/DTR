'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download, Eye, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { initials } from '@/lib/utils';
import { listEmployees, exportMasterlist, type EmployeeListItem } from '@/features/employees/api';
import { fullName } from '@/features/employees/components/fullName';
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from '@/schemas/employees.schema';

const ALL = 'ALL';

export default function EmployeesListPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');
  const canCreate = hasRole('SUPER_ADMIN'); // only the Super Admin creates employee accounts

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState(ALL);
  const [employmentType, setEmploymentType] = useState(ALL);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      search: search || undefined,
      departmentId: departmentId || undefined,
      positionId: positionId || undefined,
      employmentStatus: employmentStatus === ALL ? undefined : employmentStatus,
      employmentType: employmentType === ALL ? undefined : employmentType,
    }),
    [page, search, departmentId, positionId, employmentStatus, employmentType],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['employees', params],
    queryFn: () => listEmployees(params),
  });

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportMasterlist();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-masterlist.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Masterlist exported.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<EmployeeListItem>[] = [
    {
      key: 'employeeNo',
      header: 'Employee No.',
      render: (r) => <span className="font-medium">{r.employeeNo}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={r.profile?.photoUrl ?? undefined} alt={fullName(r.profile)} />
            <AvatarFallback className="text-xs">{initials(fullName(r.profile))}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{fullName(r.profile)}</span>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (r) => r.department?.name ?? '—' },
    { key: 'position', header: 'Position', render: (r) => r.position?.title ?? '—' },
    {
      key: 'employmentStatus',
      header: 'Status',
      render: (r) => <StatusBadge status={r.employmentStatus} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '1%',
      render: (r) => (
        <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/employees/${r.id}`}>
            <Eye className="h-4 w-4" />
            View
          </Link>
        </Button>
      ),
    },
  ];

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const toolbar = (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search employees"
          placeholder="Employee no. or name…"
          className="pl-9"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Select value={employmentStatus} onValueChange={resetPage(setEmploymentStatus)}>
        <SelectTrigger aria-label="Status filter">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {EMPLOYMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={employmentType} onValueChange={resetPage(setEmploymentType)}>
        <SelectTrigger aria-label="Type filter">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {EMPLOYMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        aria-label="Department ID filter"
        placeholder="Department UUID"
        value={departmentId}
        onChange={(e) => {
          setDepartmentId(e.target.value.trim());
          setPage(1);
        }}
      />

      <Input
        aria-label="Position ID filter"
        placeholder="Position UUID"
        className="lg:col-start-5"
        value={positionId}
        onChange={(e) => {
          setPositionId(e.target.value.trim());
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <PageHeader
          title="Employees"
          description="Browse, search, and manage employee records."
          action={
            canManage || canCreate ? (
              <>
                {canManage && (
                  <Button variant="outline" onClick={handleExport} disabled={exporting}>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Masterlist
                  </Button>
                )}
                {canCreate && (
                  <Button asChild>
                    <Link href="/dashboard/employees/new">
                      <Plus className="h-4 w-4" />
                      Add Employee
                    </Link>
                  </Button>
                )}
              </>
            ) : undefined
          }
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <DataTable<EmployeeListItem>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          emptyTitle="No employees found"
          emptyDescription="Try adjusting your search or filters."
          getRowKey={(r) => r.id}
          toolbar={toolbar}
          onRowClick={(r) => router.push(`/dashboard/employees/${r.id}`)}
        />
      </div>
    </div>
  );
}
