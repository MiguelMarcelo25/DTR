'use client';

import { ReportPage } from '@/features/reports/components/ReportPage';

export default function AppointmentsReportPage() {
  return (
    <ReportPage
      type="appointments"
      title="Appointments Report"
      description="Scheduled appointments and their outcomes."
    />
  );
}
