import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

// ─────────────────────────────────────────────────────────────
// Domain types — mirror the API contract for /holidays.
// `date` is a business day string ("YYYY-MM-DD") in both directions.
// ─────────────────────────────────────────────────────────────

export type HolidayType = 'REGULAR' | 'SPECIAL_NON_WORKING' | 'SPECIAL_WORKING';

export interface Holiday {
  id: string;
  /** Business day, "YYYY-MM-DD". */
  date: string;
  name: string;
  type: HolidayType;
}

export const HOLIDAY_TYPES: HolidayType[] = [
  'REGULAR',
  'SPECIAL_NON_WORKING',
  'SPECIAL_WORKING',
];

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  REGULAR: 'Regular',
  SPECIAL_NON_WORKING: 'Special (Non-Working)',
  SPECIAL_WORKING: 'Special (Working)',
};

// ─────────────────────────────────────────────────────────────
// Params / payloads
// ─────────────────────────────────────────────────────────────

export interface ListHolidaysParams {
  /** Filter to a calendar year; omit for all. */
  year?: number;
}

export interface HolidayPayload {
  /** "YYYY-MM-DD". */
  date: string;
  name: string;
  type: HolidayType;
}

// ─────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────

/** GET /holidays?year? — list sorted by date (any authenticated staff). */
export async function listHolidays(params: ListHolidaysParams = {}): Promise<Holiday[]> {
  const res = await api.get<ApiResponse<Holiday[]>>('/holidays', { params });
  return res.data.data;
}

/** POST /holidays — create a holiday [SUPER_ADMIN, ADMIN]. */
export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  const res = await api.post<ApiResponse<Holiday>>('/holidays', payload);
  return res.data.data;
}

/** PUT /holidays/:id — partial update [SUPER_ADMIN, ADMIN]. */
export async function updateHoliday(
  id: string,
  payload: Partial<HolidayPayload>,
): Promise<Holiday> {
  const res = await api.put<ApiResponse<Holiday>>(`/holidays/${id}`, payload);
  return res.data.data;
}

/** DELETE /holidays/:id — remove a holiday [SUPER_ADMIN, ADMIN]. */
export async function deleteHoliday(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/holidays/${id}`);
}
