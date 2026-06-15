'use client';

import { TimeClock } from '@/features/attendance/components/TimeClock';
import { PageHeader } from '@/components/shared/PageHeader';

export default function TimeClockPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Clock"
        description="Record your daily attendance punches."
      />
      <div className="mx-auto max-w-md">
        <TimeClock big />
      </div>
    </div>
  );
}
