'use client';

import { ReportPage } from '@/features/reports/components/ReportPage';

export default function EmployeesReportPage() {
  return (
    <ReportPage
      type="employees"
      title="Employee Masterlist"
      description="Full roster with employment, contact, and (for privileged roles) payroll details."
    />
  );
}
