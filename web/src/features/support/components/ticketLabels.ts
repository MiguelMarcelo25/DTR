import type { TicketComment } from '@/features/support/api';

// Re-export the shared label/badge helpers so portal pages have one import site.
export { titleCase, PriorityBadge } from '@/features/support/components/badges';

/** Best-effort display name for a comment author. */
export function authorDisplayName(author: TicketComment['author']): string {
  if (author.clientProfile?.fullName) return author.clientProfile.fullName;
  const p = author.employee?.profile;
  if (p) return `${p.firstName} ${p.lastName}`.trim();
  return author.email;
}

/** A comment is from staff when it has an employee profile (not a client). */
export function isStaffComment(author: TicketComment['author']): boolean {
  return !!author.employee;
}
