/**
 * Date/time helpers for attendance & payroll.
 *
 * The process runs in the business timezone (process.env.TZ = APP_TIMEZONE, set
 * in config/env.ts). Clock-time math (atTime/diffMinutes) operates on real
 * instants in that TZ. Calendar-DAY keys are stored in Prisma `@db.Date`
 * columns, which Prisma truncates in **UTC** — so `startOfDay`/`startOfMonth`/
 * `endOfMonth` return UTC-midnight of the business-local calendar date, ensuring
 * the stored/queried day matches the business day (no off-by-one on a UTC host).
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

/**
 * Business calendar day → UTC-midnight of that day, so Prisma `@db.Date` stores
 * the correct day. Uses local (business-TZ) getters to read the calendar date.
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function startOfMonth(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

export function endOfMonth(year: number, month0: number): Date {
  // Day 0 of the next month = last day of this month.
  return new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59, 999));
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
