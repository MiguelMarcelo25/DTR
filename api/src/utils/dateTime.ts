/**
 * Date/time helpers used by attendance and payroll. All math is done in minutes
 * to keep computations integer-safe and timezone-agnostic (the API treats clock
 * times as wall-clock values supplied by the server / client consistently).
 */

/** Combine a calendar date with an "HH:mm" string into a Date. */
export function atTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/** Whole minutes between two dates (b - a), never negative. */
export function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

/** 0 (Sun) … 6 (Sat). */
export function dayOfWeek(date: Date): number {
  return new Date(date).getDay();
}

/** Strip time → midnight (used to key attendance rows by calendar date). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1, 0, 0, 0, 0);
}

export function endOfMonth(year: number, month0: number): Date {
  return new Date(year, month0 + 1, 0, 23, 59, 59, 999);
}

/** Inclusive count of calendar days between two dates. */
export function inclusiveDays(start: Date, end: Date): number {
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return Math.max(0, Math.round((b - a) / 86400000)) + 1;
}

export function formatHHmm(date: Date | null | undefined): string {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
