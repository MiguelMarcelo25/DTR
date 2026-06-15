'use client';

import { Mail, Phone, MapPin, Briefcase, CalendarDays, Shield } from 'lucide-react';
import type { EmployeeProfile, EmployeeRecord } from '@/features/profile/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { FieldRow } from '@/features/profile/components/FieldRow';
import { formatDate } from '@/lib/utils';
import {
  employmentTypeLabel,
  positionDepartment,
  profileFullName,
} from '@/features/profile/helpers';

export function OverviewTab({
  employee,
  profile,
}: {
  employee?: EmployeeRecord | null;
  profile?: EmployeeProfile | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Contact">
        <dl className="divide-y">
          <FieldRow
            label="Email"
            value={
              profile?.email ? (
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {profile.email}
                </span>
              ) : null
            }
          />
          <FieldRow
            label="Contact number"
            value={
              profile?.contactNumber ? (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {profile.contactNumber}
                </span>
              ) : null
            }
          />
          <FieldRow
            label="Current address"
            value={
              profile?.currentAddress ? (
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {profile.currentAddress}
                </span>
              ) : null
            }
          />
        </dl>
      </SectionCard>

      <SectionCard title="Employment">
        <dl className="divide-y">
          <FieldRow label="Full name" value={profileFullName(profile)} />
          <FieldRow
            label="Position / Department"
            value={
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {positionDepartment(employee)}
              </span>
            }
          />
          <FieldRow
            label="Employment type"
            value={employmentTypeLabel(employee?.employmentType)}
          />
          <FieldRow label="Status" value={<StatusBadge status={employee?.employmentStatus} />} />
          <FieldRow
            label="Date hired"
            value={
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatDate(employee?.dateHired)}
              </span>
            }
          />
          <FieldRow
            label="Supervisor"
            value={
              employee?.supervisor?.profile ? (
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {employee.supervisor.profile.firstName} {employee.supervisor.profile.lastName}
                </span>
              ) : null
            }
          />
        </dl>
      </SectionCard>
    </div>
  );
}
