'use client';

import { useAuth } from '@/providers/AuthProvider';
import type { EmployeeProfile, EmployeeRecord } from '@/features/profile/api';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { FieldRow } from '@/features/profile/components/FieldRow';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { employmentTypeLabel } from '@/features/profile/helpers';

export function EmploymentTab({
  employee,
  profile,
}: {
  employee?: EmployeeRecord | null;
  profile?: EmployeeProfile | null;
}) {
  const { hasRole } = useAuth();
  // Sensitive payroll fields are only returned to privileged readers; never
  // render them for plain employees even if present.
  const canSeePayroll = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Employment Details">
        <dl className="divide-y">
          <FieldRow label="Employee No." value={employee?.employeeNo} />
          <FieldRow label="Department" value={employee?.department?.name} />
          <FieldRow label="Position" value={employee?.position?.title} />
          <FieldRow label="Rank" value={employee?.rank} />
          <FieldRow label="Branch" value={employee?.branch?.name} />
          <FieldRow
            label="Employment type"
            value={employmentTypeLabel(employee?.employmentType)}
          />
          <FieldRow label="Status" value={<StatusBadge status={employee?.employmentStatus} />} />
          <FieldRow label="Date hired" value={formatDate(employee?.dateHired)} />
          <FieldRow
            label="Regularization date"
            value={formatDate(employee?.regularizationDate)}
          />
        </dl>
      </SectionCard>

      <SectionCard title="Schedule">
        <dl className="divide-y">
          <FieldRow label="Schedule" value={employee?.schedule?.name} />
          <FieldRow
            label="Working hours"
            value={
              employee?.schedule
                ? `${employee.schedule.timeIn} – ${employee.schedule.timeOut}`
                : null
            }
          />
        </dl>
      </SectionCard>

      {canSeePayroll && (
        <SectionCard
          title="Compensation"
          description="Visible to HR / administrators only."
          className="lg:col-span-2"
        >
          <dl className="divide-y">
            <FieldRow label="Salary type" value={profile?.salaryType} />
            <FieldRow label="Basic salary" value={formatCurrency(profile?.basicSalary)} />
            <FieldRow label="Allowances" value={formatCurrency(profile?.allowances)} />
            <FieldRow label="Tax status" value={profile?.taxStatus} />
          </dl>
        </SectionCard>
      )}
    </div>
  );
}
