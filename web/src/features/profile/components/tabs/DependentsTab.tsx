'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDependents, type Dependent } from '@/features/profile/api';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const columns: Column<Dependent & Record<string, unknown>>[] = [
  { key: 'fullName', header: 'Full name' },
  { key: 'relationship', header: 'Relationship', render: (r) => r.relationship ?? '—' },
  { key: 'dateOfBirth', header: 'Date of birth', render: (r) => formatDate(r.dateOfBirth) },
  { key: 'contactNumber', header: 'Contact', render: (r) => r.contactNumber ?? '—' },
  {
    key: 'isDependentForBenefits',
    header: 'For benefits',
    align: 'right',
    render: (r) =>
      r.isDependentForBenefits ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>,
  },
];

export function DependentsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'dependents'],
    queryFn: () => fetchDependents(employeeId),
  });

  return (
    <DataTable
      columns={columns}
      rows={(data ?? []) as (Dependent & Record<string, unknown>)[]}
      loading={isLoading}
      emptyTitle="No dependents"
      emptyDescription="No dependents are on file for your profile."
    />
  );
}
