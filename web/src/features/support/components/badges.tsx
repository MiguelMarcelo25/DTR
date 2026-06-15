import { Badge } from '@/components/ui/badge';
import type { TicketPriority, TicketStatus } from '@/features/support/api';

const PRIORITY_VARIANT: Record<TicketPriority, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'warning',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className="capitalize">
      {priority.toLowerCase()}
    </Badge>
  );
}

/** Accent color per kanban column. */
export const STATUS_ACCENT: Record<TicketStatus, string> = {
  NEW: 'bg-blue-500',
  OPEN: 'bg-indigo-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-slate-400',
};

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
