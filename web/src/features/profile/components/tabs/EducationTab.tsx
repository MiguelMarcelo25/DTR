'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEducation, type Education } from '@/features/profile/api';
import { DataTable, type Column } from '@/components/shared/DataTable';

const columns: Column<Education & Record<string, unknown>>[] = [
  { key: 'schoolName', header: 'School' },
  { key: 'degree', header: 'Degree', render: (r) => r.degree ?? '—' },
  { key: 'educationLevel', header: 'Level', render: (r) => r.educationLevel ?? '—' },
  {
    key: 'years',
    header: 'Years',
    align: 'right',
    render: (r) =>
      r.yearStarted || r.yearGraduated
        ? `${r.yearStarted ?? '—'} – ${r.yearGraduated ?? '—'}`
        : '—',
  },
  { key: 'honors', header: 'Honors', render: (r) => r.honors ?? '—' },
];

export function EducationTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'education'],
    queryFn: () => fetchEducation(employeeId),
  });

  return (
    <DataTable
      columns={columns}
      rows={(data ?? []) as (Education & Record<string, unknown>)[]}
      loading={isLoading}
      emptyTitle="No education records"
      emptyDescription="No educational background is on file for your profile."
    />
  );
}
