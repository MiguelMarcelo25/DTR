'use client';

import { ReportPage } from '@/features/reports/components/ReportPage';

export default function LeaveReportPage() {
  return (
    <ReportPage
      type="leave"
      title="Leave Report"
      description="Leave requests by type and status, with total days."
    />
  );
}
