'use client';

import type { EmployeeProfile } from '@/features/profile/api';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { FieldRow } from '@/features/profile/components/FieldRow';
import { formatDate } from '@/lib/utils';
import { civilStatusLabel, genderLabel } from '@/features/profile/helpers';

export function PersonalTab({ profile }: { profile?: EmployeeProfile | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Personal Information">
        <dl className="divide-y">
          <FieldRow label="First name" value={profile?.firstName} />
          <FieldRow label="Middle name" value={profile?.middleName} />
          <FieldRow label="Last name" value={profile?.lastName} />
          <FieldRow label="Suffix" value={profile?.suffix} />
          <FieldRow label="Date of birth" value={formatDate(profile?.dateOfBirth)} />
          <FieldRow label="Gender" value={genderLabel(profile?.gender)} />
          <FieldRow label="Civil status" value={civilStatusLabel(profile?.civilStatus)} />
          <FieldRow label="Nationality" value={profile?.nationality} />
        </dl>
      </SectionCard>

      <SectionCard
        title="Contact & Address"
        description="Changes to address & contact require HR approval."
      >
        <dl className="divide-y">
          <FieldRow label="Email" value={profile?.email} />
          <FieldRow label="Contact number" value={profile?.contactNumber} />
          <FieldRow label="Current address" value={profile?.currentAddress} />
          <FieldRow label="Permanent address" value={profile?.permanentAddress} />
        </dl>
      </SectionCard>
    </div>
  );
}
