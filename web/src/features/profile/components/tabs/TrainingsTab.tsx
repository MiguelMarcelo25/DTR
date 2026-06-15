'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { fetchTrainings, type Training } from '@/features/profile/api';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';

const columns: Column<Training & Record<string, unknown>>[] = [
  { key: 'name', header: 'Training' },
  { key: 'provider', header: 'Provider', render: (r) => r.provider ?? '—' },
  { key: 'dateCompleted', header: 'Completed', render: (r) => formatDate(r.dateCompleted) },
  { key: 'expirationDate', header: 'Expires', render: (r) => formatDate(r.expirationDate) },
  { key: 'certificateNumber', header: 'Certificate #', render: (r) => r.certificateNumber ?? '—' },
  {
    key: 'documentUrl',
    header: 'Document',
    align: 'right',
    render: (r) =>
      r.documentUrl ? (
        <a
          href={r.documentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          View <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        '—'
      ),
  },
];

export function TrainingsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'trainings'],
    queryFn: () => fetchTrainings(employeeId),
  });

  return (
    <DataTable
      columns={columns}
      rows={(data ?? []) as (Training & Record<string, unknown>)[]}
      loading={isLoading}
      emptyTitle="No trainings"
      emptyDescription="No trainings or certifications are on file for your profile."
    />
  );
}
