'use client';

import { ReportPage } from '@/features/reports/components/ReportPage';

export default function PayrollReportPage() {
  return (
    <ReportPage
      type="payroll"
      title="Payroll Report"
      description="Payroll totals per period and employee."
    />
  );
}
