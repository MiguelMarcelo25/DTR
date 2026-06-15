import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const MAP: Record<string, Variant> = {
  // generic request/leave/appointment/payroll statuses
  PENDING: 'warning',
  PROCESSING: 'warning',
  DRAFT: 'secondary',
  APPROVED: 'success',
  COMPLETED: 'success',
  RELEASED: 'success',
  ACTIVE: 'success',
  PRESENT: 'success',
  FIT: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
  TERMINATED: 'destructive',
  ABSENT: 'destructive',
  UNFIT: 'destructive',
  RESCHEDULED: 'secondary',
  INACTIVE: 'secondary',
  ON_LEAVE: 'secondary',
  RESIGNED: 'secondary',
  LATE: 'warning',
  HALF_DAY: 'warning',
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  const variant = MAP[status] ?? 'outline';
  const label = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}
