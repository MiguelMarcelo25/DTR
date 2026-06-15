'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWorkExperience, type WorkExperience } from '@/features/profile/api';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';

const columns: Column<WorkExperience & Record<string, unknown>>[] = [
  { key: 'companyName', header: 'Company' },
  { key: 'position', header: 'Position', render: (r) => r.position ?? '—' },
  {
    key: 'period',
    header: 'Period',
    render: (r) => `${formatDate(r.startDate)} – ${r.endDate ? formatDate(r.endDate) : 'Present'}`,
  },
  {
    key: 'reasonForLeaving',
    header: 'Reason for leaving',
    render: (r) => r.reasonForLeaving ?? '—',
  },
];

export function WorkExperienceTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'work-experience'],
    queryFn: () => fetchWorkExperience(employeeId),
  });

  return (
    <DataTable
      columns={columns}
      rows={(data ?? []) as (WorkExperience & Record<string, unknown>)[]}
      loading={isLoading}
      emptyTitle="No work experience"
      emptyDescription="No prior work experience is on file for your profile."
    />
  );
}
