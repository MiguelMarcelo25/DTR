import axios from 'axios';
import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta } from '@/types';

// ─────────────────────────────────────────────────────────────
// Types (mirror the API responses)
// ─────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'COMPLETED';

export interface AppointmentSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string | null;
  purpose: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentEmployee {
  id: string;
  employeeNo: string;
  profile: { firstName: string; lastName: string } | null;
}

export interface Appointment {
  id: string;
  employeeId: string;
  slotId: string | null;
  purpose: string;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  note: string | null;
  reviewedById: string | null;
  rescheduledFromId: string | null;
  slot: AppointmentSlot | null;
  employee: AppointmentEmployee | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentReport {
  total: number;
  byStatus: Record<string, number>;
  range: { from: string | null; to: string | null };
}

export interface CalendarIntegrationStatus {
  configured: boolean;
  authMode: string | null;
  calendarId: string | null;
  queuedCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncAt?: string | null;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Query param shapes
// ─────────────────────────────────────────────────────────────

export interface ListAppointmentsParams {
  status?: AppointmentStatus;
  employeeId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface ListSlotsParams {
  date?: string;
  from?: string;
  to?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface CalendarParams {
  from: string;
  to: string;
  employeeId?: string;
  status?: AppointmentStatus;
}

export interface BookAppointmentPayload {
  slotId?: string;
  purpose: string;
  scheduledDate: string;
  scheduledTime: string;
  note?: string;
}

export interface RescheduleAppointmentPayload {
  slotId?: string | null;
  scheduledDate?: string;
  scheduledTime?: string;
  note?: string;
}

export interface CreateSlotPayload {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location?: string;
  purpose?: string;
  isActive?: boolean;
}

export interface UpdateSlotPayload {
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  location?: string | null;
  purpose?: string | null;
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────

export async function listAppointments(
  params: ListAppointmentsParams,
): Promise<Paginated<Appointment>> {
  const res = await api.get<ApiResponse<Appointment[]>>('/appointments', { params });
  return {
    items: res.data.data,
    meta: res.data.meta as PaginationMeta,
  };
}

export async function getAppointment(id: string): Promise<Appointment> {
  const res = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
  return res.data.data;
}

export async function getCalendar(params: CalendarParams): Promise<Appointment[]> {
  const res = await api.get<ApiResponse<Appointment[]>>('/appointments/calendar', { params });
  return res.data.data;
}

export async function getReports(params: { from?: string; to?: string }): Promise<AppointmentReport> {
  const res = await api.get<ApiResponse<AppointmentReport>>('/appointments/reports', { params });
  return res.data.data;
}

export async function fetchCalendarIntegrationStatus(): Promise<CalendarIntegrationStatus | null> {
  try {
    const res = await api.get<ApiResponse<CalendarIntegrationStatus>>('/calendar-integration/status');
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function bookAppointment(payload: BookAppointmentPayload): Promise<Appointment> {
  const res = await api.post<ApiResponse<Appointment>>('/appointments', payload);
  return res.data.data;
}

export async function rescheduleAppointment(
  id: string,
  payload: RescheduleAppointmentPayload,
): Promise<Appointment> {
  const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}/reschedule`, payload);
  return res.data.data;
}

export async function cancelAppointment(id: string, note?: string): Promise<Appointment> {
  const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}/cancel`, { note });
  return res.data.data;
}

export async function approveAppointment(id: string, note?: string): Promise<Appointment> {
  const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}/approve`, { note });
  return res.data.data;
}

export async function rejectAppointment(id: string, note?: string): Promise<Appointment> {
  const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}/reject`, { note });
  return res.data.data;
}

export async function completeAppointment(id: string, note?: string): Promise<Appointment> {
  const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}/complete`, { note });
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Slots
// ─────────────────────────────────────────────────────────────

export async function listSlots(params: ListSlotsParams): Promise<Paginated<AppointmentSlot>> {
  const res = await api.get<ApiResponse<AppointmentSlot[]>>('/appointment-slots', { params });
  return {
    items: res.data.data,
    meta: res.data.meta as PaginationMeta,
  };
}

export async function createSlot(payload: CreateSlotPayload): Promise<AppointmentSlot> {
  const res = await api.post<ApiResponse<AppointmentSlot>>('/appointment-slots', payload);
  return res.data.data;
}

export async function updateSlot(id: string, payload: UpdateSlotPayload): Promise<AppointmentSlot> {
  const res = await api.put<ApiResponse<AppointmentSlot>>(`/appointment-slots/${id}`, payload);
  return res.data.data;
}

export async function deleteSlot(id: string): Promise<void> {
  await api.delete(`/appointment-slots/${id}`);
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

export function employeeName(a: Appointment): string {
  const p = a.employee?.profile;
  if (p) return `${p.firstName} ${p.lastName}`.trim();
  return a.employee?.employeeNo ?? '—';
}
