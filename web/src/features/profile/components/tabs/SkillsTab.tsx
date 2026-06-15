'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSkills, type Skill } from '@/features/profile/api';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { SKILL_LEVEL_LABEL } from '@/features/profile/helpers';

const columns: Column<Skill & Record<string, unknown>>[] = [
  { key: 'skillName', header: 'Skill' },
  {
    key: 'skillLevel',
    header: 'Level',
    render: (r) => <Badge variant="secondary">{SKILL_LEVEL_LABEL[r.skillLevel]}</Badge>,
  },
  {
    key: 'yearsOfExperience',
    header: 'Experience',
    align: 'right',
    render: (r) =>
      r.yearsOfExperience != null ? `${r.yearsOfExperience} yr${r.yearsOfExperience === 1 ? '' : 's'}` : '—',
  },
  { key: 'remarks', header: 'Remarks', render: (r) => r.remarks ?? '—' },
];

export function SkillsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'skills'],
    queryFn: () => fetchSkills(employeeId),
  });

  return (
    <DataTable
      columns={columns}
      rows={(data ?? []) as (Skill & Record<string, unknown>)[]}
      loading={isLoading}
      emptyTitle="No skills"
      emptyDescription="No skills are on file for your profile."
    />
  );
}
