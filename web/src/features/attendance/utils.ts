/** Attendance display helpers shared across the feature pages. */

/** Format an ISO datetime as a short clock time (e.g. "08:32 AM"); '—' if null. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convert a minutes count into a compact "Hh Mm" label; '—' for zero/empty. */
export function formatMinutes(minutes: number | null | undefined): string {
  const m = Number(minutes ?? 0);
  if (!m) return '—';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h && rem) return `${h}h ${rem}m`;
  if (h) return `${h}h`;
  return `${rem}m`;
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Weekday short label for a given ISO date. */
export function weekday(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', { weekday: 'short' });
}
