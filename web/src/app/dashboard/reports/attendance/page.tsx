'use client';

import { ReportPage } from '@/features/reports/components/ReportPage';

export default function AttendanceReportPage() {
  return (
    <ReportPage
      type="attendance"
      title="Attendance Report"
      description="Daily attendance with late, undertime, and worked-hours totals."
    />
  );
}
