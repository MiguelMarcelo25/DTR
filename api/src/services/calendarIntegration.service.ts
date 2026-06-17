import { createHash } from 'node:crypto';
import { forbidden } from '../utils/errors';

const GOOGLE_EVENT_ID_MIN_LENGTH = 5;
const GOOGLE_EVENT_ID_MAX_LENGTH = 1024;
const GOOGLE_EVENT_ID_PATTERN = /^[a-v0-9]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYNC_VERSION = '1';

export type CalendarErrorClassification =
  | 'retry'
  | 'permanent'
  | 'auth'
  | 'sync-reset'
  | 'conflict';

export type CalendarAppointmentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | string;

export interface CalendarAppointmentForSync {
  id: string;
  slotId?: string | null;
  purpose?: string | null;
  scheduledDate: Date | string;
  scheduledTime: string;
  status: CalendarAppointmentStatus;
  note?: string | null;
  location?: string | null;
  slot?: {
    id?: string | null;
    location?: string | null;
  } | null;
}

export interface BuildGoogleEventInput {
  appointment: CalendarAppointmentForSync;
  timezone: string;
  durationMinutes?: number;
  environment?: string;
}

export interface GoogleEventPayload {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  status: 'tentative' | 'confirmed' | 'cancelled';
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  extendedProperties: {
    private: {
      hrmsAppointmentId: string;
      hrmsSlotId: string;
      hrmsEnvironment: string;
      hrmsSyncVersion: string;
    };
  };
}

export interface CalendarIntegrationStatus {
  configured: boolean;
  authMode: 'none' | 'service_account' | 'oauth';
  calendarId: string | null;
  lastSyncAt: string | null;
  queuedCount: number;
  failedCount: number;
  conflictCount: number;
}

export interface EnqueueAppointmentSyncInput {
  appointmentId: string;
  action?: 'UPSERT' | 'DELETE';
  requestedByUserId?: string;
}

export interface QueuedAppointmentSync {
  id: string;
  provider: 'google-calendar';
  appointmentId: string;
  googleEventId: string;
  action: 'UPSERT' | 'DELETE';
  status: 'QUEUED';
  attempts: number;
  queuedAt: string;
  requestedByUserId: string | null;
  lastError: string | null;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

type HeaderValue = string | string[] | undefined;

export function deterministicGoogleEventId(appointmentId: string): string {
  const normalized = appointmentId.trim().toLowerCase();
  if (!normalized) throw new Error('appointmentId is required');

  const idBody = UUID_PATTERN.test(normalized)
    ? normalized.replace(/-/g, '')
    : createHash('sha256').update(normalized).digest('hex');

  const eventId = `hrms${idBody}`.slice(0, GOOGLE_EVENT_ID_MAX_LENGTH);
  if (
    eventId.length < GOOGLE_EVENT_ID_MIN_LENGTH ||
    !GOOGLE_EVENT_ID_PATTERN.test(eventId)
  ) {
    throw new Error('appointmentId cannot produce a Google-safe event id');
  }

  return eventId;
}

export function buildGoogleEvent(input: BuildGoogleEventInput): GoogleEventPayload {
  const durationMinutes = input.durationMinutes ?? 30;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('durationMinutes must be a positive number');
  }

  const date = datePart(input.appointment.scheduledDate);
  const startInstant = zonedLocalToInstant(date, input.appointment.scheduledTime, input.timezone);
  const endInstant = new Date(startInstant.getTime() + durationMinutes * 60_000);
  const summary = cleanText(input.appointment.purpose) ?? 'HRMS appointment';
  const description = cleanText(input.appointment.note);
  const location = cleanText(input.appointment.location ?? input.appointment.slot?.location);
  const event: GoogleEventPayload = {
    id: deterministicGoogleEventId(input.appointment.id),
    summary,
    status: googleStatusFor(input.appointment.status),
    start: {
      dateTime: formatZonedRfc3339(startInstant, input.timezone),
      timeZone: input.timezone,
    },
    end: {
      dateTime: formatZonedRfc3339(endInstant, input.timezone),
      timeZone: input.timezone,
    },
    extendedProperties: {
      private: {
        hrmsAppointmentId: input.appointment.id,
        hrmsSlotId: input.appointment.slotId ?? input.appointment.slot?.id ?? '',
        hrmsEnvironment: input.environment ?? process.env.NODE_ENV ?? 'development',
        hrmsSyncVersion: SYNC_VERSION,
      },
    },
  };

  if (description) event.description = description;
  if (location) event.location = location;

  return event;
}

export function classifyCalendarError(status: number): CalendarErrorClassification {
  if (status === 401 || status === 403) return 'auth';
  if (status === 410) return 'sync-reset';
  if (status === 409 || status === 412) return 'conflict';
  if (status === 429 || status >= 500) return 'retry';
  return 'permanent';
}

export function shouldRetryCalendarError(status: number): boolean {
  return classifyCalendarError(status) === 'retry';
}

export function getCalendarIntegrationStatus(
  envSource: NodeJS.ProcessEnv = process.env,
): CalendarIntegrationStatus {
  const calendarId = cleanText(envSource.GOOGLE_CALENDAR_ID) ?? null;
  const hasServiceAccount =
    Boolean(cleanText(envSource.GOOGLE_CALENDAR_CLIENT_EMAIL)) &&
    Boolean(cleanText(envSource.GOOGLE_CALENDAR_PRIVATE_KEY));
  const hasOauth =
    Boolean(cleanText(envSource.GOOGLE_CALENDAR_CLIENT_ID)) &&
    Boolean(cleanText(envSource.GOOGLE_CALENDAR_CLIENT_SECRET)) &&
    Boolean(cleanText(envSource.GOOGLE_CALENDAR_REFRESH_TOKEN));
  const explicitlyEnabled = envSource.GOOGLE_CALENDAR_ENABLED === 'true';
  const configured = Boolean(calendarId && (hasServiceAccount || hasOauth || explicitlyEnabled));

  return {
    configured,
    authMode: configured ? (hasServiceAccount ? 'service_account' : 'oauth') : 'none',
    calendarId,
    lastSyncAt: null,
    queuedCount: 0,
    failedCount: 0,
    conflictCount: 0,
  };
}

export function enqueueAppointmentSync(
  input: EnqueueAppointmentSyncInput,
  now: Date = new Date(),
): QueuedAppointmentSync {
  const googleEventId = deterministicGoogleEventId(input.appointmentId);

  return {
    id: `calendar-sync-${googleEventId}`,
    provider: 'google-calendar',
    appointmentId: input.appointmentId,
    googleEventId,
    action: input.action ?? 'UPSERT',
    status: 'QUEUED',
    attempts: 0,
    queuedAt: now.toISOString(),
    requestedByUserId: input.requestedByUserId ?? null,
    lastError: null,
  };
}

export function handleGoogleCalendarWebhook(
  headers: Record<string, HeaderValue>,
  envSource: NodeJS.ProcessEnv = process.env,
): { accepted: true } {
  const expectedToken = cleanText(envSource.GOOGLE_CALENDAR_WEBHOOK_TOKEN);
  if (expectedToken) {
    const actualToken = readHeader(headers, 'x-goog-channel-token');
    if (actualToken !== expectedToken) {
      throw forbidden('Invalid Google Calendar webhook token');
    }
  }

  return { accepted: true };
}

function googleStatusFor(status: CalendarAppointmentStatus): GoogleEventPayload['status'] {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'confirmed';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'cancelled';
  return 'tentative';
}

function datePart(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new Error('scheduledDate is invalid');
  return parsed.toISOString().slice(0, 10);
}

function zonedLocalToInstant(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!timeMatch) throw new Error('scheduledTime must be in HH:mm format');

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const targetLocalAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = new Date(targetLocalAsUtc);

  for (let i = 0; i < 3; i += 1) {
    const parts = getZonedParts(instant, timezone);
    const actualLocalAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = actualLocalAsUtc - targetLocalAsUtc;
    if (diff === 0) return instant;
    instant = new Date(instant.getTime() - diff);
  }

  return instant;
}

function formatZonedRfc3339(instant: Date, timezone: string): string {
  const parts = getZonedParts(instant, timezone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const offsetMinutes = Math.round((localAsUtc - instant.getTime()) / 60_000);

  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(
    parts.minute,
  )}:${pad(parts.second)}${formatOffset(offsetMinutes)}`;
}

function getZonedParts(instant: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${pad(hours)}:${pad(minutes)}`;
}

function pad(value: number, length = 2): string {
  return value.toString().padStart(length, '0');
}

function cleanText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readHeader(headers: Record<string, HeaderValue>, name: string): string | undefined {
  const header = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  if (Array.isArray(header)) return header[0];
  return header;
}
