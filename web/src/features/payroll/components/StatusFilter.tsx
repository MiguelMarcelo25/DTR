'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PayrollStatus } from '@/features/payroll/api';

export const PAYROLL_STATUSES: PayrollStatus[] = [
  'DRAFT',
  'PROCESSING',
  'COMPLETED',
  'RELEASED',
  'CANCELLED',
];

const LABELS: Record<PayrollStatus, string> = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  RELEASED: 'Released',
  CANCELLED: 'Cancelled',
};

const ALL = '__all__';

/** Status dropdown with an "All statuses" option. Emits `undefined` for "all". */
export function StatusFilter({
  value,
  onChange,
  className,
}: {
  value: PayrollStatus | undefined;
  onChange: (status: PayrollStatus | undefined) => void;
  className?: string;
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? undefined : (v as PayrollStatus))}
    >
      <SelectTrigger className={className ?? 'w-[180px]'}>
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {PAYROLL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
