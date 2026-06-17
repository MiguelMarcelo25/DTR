import { createHash } from 'node:crypto';
import {
  CalendarEventShadowStatus,
  CalendarIntegrationStatus as DbCalendarIntegrationStatus,
  CalendarProvider,
  CalendarSyncAction,
  CalendarSyncDirection,
  CalendarSyncStatus,
  type Prisma,
} from '@prisma/client';
import { calendar_v3, google } from 'googleapis';
import prisma from '../config/prisma';
import { badRequest, forbidden } from '../utils/errors';

const GOOGLE_EVENT_ID_MIN_LENGTH = 5;
const GOOGLE_EVENT_ID_MAX_LENGTH = 1024;
const GOOGLE_EVENT_ID_PATTERN = /^[a-v0-9]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYNC_VERSION = '1';
const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const RETRYABLE_SYNC_STATUSES = [CalendarSyncStatus.QUEUED, CalendarSyncStatus.FAILED];

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
  durationMinutes?: number | null;
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

export interface CalendarSyncProcessResult {
  configured: boolean;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  conflictCount: number;
  queuedCount: number;
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

interface CalendarRuntimeConfig {
  configured: boolean;
  authMode: 'none' | 'service_account' | 'oauth';
  calendarId: string | null;
  timezone: string;
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  impersonateEmail?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
}

function calendarConfig(envSource: NodeJS.ProcessEnv = process.env): CalendarRuntimeConfig {
  const calendarId = cleanText(envSource.GOOGLE_CALENDAR_ID) ?? null;
  const serviceAccountEmail = cleanText(envSource.GOOGLE_CALENDAR_CLIENT_EMAIL);
  const serviceAccountPrivateKey = normalizePrivateKey(cleanText(envSource.GOOGLE_CALENDAR_PRIVATE_KEY));
  const oauthClientId = cleanText(envSource.GOOGLE_CALENDAR_CLIENT_ID);
  const oauthClientSecret = cleanText(envSource.GOOGLE_CALENDAR_CLIENT_SECRET);
  const oauthRefreshToken = cleanText(envSource.GOOGLE_CALENDAR_REFRESH_TOKEN);
  const hasServiceAccount = Boolean(serviceAccountEmail && serviceAccountPrivateKey);
  const hasOauth = Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);
  const authMode = hasServiceAccount ? 'service_account' : hasOauth ? 'oauth' : 'none';

  return {
    configured: Boolean(calendarId && authMode !== 'none'),
    authMode,
    calendarId,
    timezone: cleanText(envSource.GOOGLE_CALENDAR_TIMEZONE) ?? cleanText(envSource.APP_TIMEZONE) ?? 'Asia/Manila',
    serviceAccountEmail,
    serviceAccountPrivateKey,
    impersonateEmail: cleanText(envSource.GOOGLE_CALENDAR_IMPERSONATE_EMAIL),
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
  };
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '\n');
}

function googleCalendarApi(config = calendarConfig()): calendar_v3.Calendar {
  if (!config.configured || !config.calendarId) {
    throw badRequest('Google Calendar integration is not configured', 'CALENDAR_NOT_CONFIGURED');
  }

  if (config.authMode === 'service_account') {
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.serviceAccountPrivateKey,
      scopes: GOOGLE_CALENDAR_SCOPES,
      subject: config.impersonateEmail,
    });
    return google.calendar({ version: 'v3', auth });
  }

  if (config.authMode === 'oauth') {
    const auth = new google.auth.OAuth2(config.oauthClientId, config.oauthClientSecret);
    auth.setCredentials({ refresh_token: config.oauthRefreshToken });
    return google.calendar({ version: 'v3', auth });
  }

  throw badRequest('Google Calendar credentials are incomplete', 'CALENDAR_NOT_CONFIGURED');
}

function googleErrorStatus(error: unknown): number {
  const err = error as {
    code?: number | string;
    status?: number;
    response?: { status?: number; data?: { error?: { code?: number }; code?: number } };
  };
  return Number(err.response?.status ?? err.response?.data?.error?.code ?? err.response?.data?.code ?? err.status ?? err.code ?? 500);
}

function googleErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Google Calendar sync failed';
}

function retryAt(attempts: number, now = new Date()): Date {
  const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  return new Date(now.getTime() + minutes * 60_000);
}

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

export async function getCalendarIntegrationStatus(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<CalendarIntegrationStatus> {
  const config = calendarConfig(envSource);
  const where: Prisma.CalendarSyncOutboxWhereInput = { provider: CalendarProvider.GOOGLE };
  const [integration, queuedCount, failedCount, conflictCount] = await Promise.all([
    config.calendarId
      ? prisma.calendarIntegration.findUnique({
          where: {
            provider_calendarId: {
              provider: CalendarProvider.GOOGLE,
              calendarId: config.calendarId,
            },
          },
        })
      : Promise.resolve(null),
    prisma.calendarSyncOutbox.count({
      where: { ...where, status: CalendarSyncStatus.QUEUED },
    }),
    prisma.calendarSyncOutbox.count({
      where: { ...where, status: CalendarSyncStatus.FAILED },
    }),
    prisma.calendarSyncOutbox.count({
      where: { ...where, status: CalendarSyncStatus.CONFLICT },
    }),
  ]);

  return {
    configured: config.configured,
    authMode: config.authMode,
    calendarId: config.calendarId,
    lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
    queuedCount,
    failedCount,
    conflictCount,
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

export async function queueAppointmentSync(
  input: EnqueueAppointmentSyncInput,
  now: Date = new Date(),
) {
  const queued = enqueueAppointmentSync(input, now);

  return prisma.calendarSyncOutbox.create({
    data: {
      provider: CalendarProvider.GOOGLE,
      appointmentId: input.appointmentId,
      googleEventId: queued.googleEventId,
      action: input.action === 'DELETE' ? CalendarSyncAction.DELETE : CalendarSyncAction.UPSERT,
      status: CalendarSyncStatus.QUEUED,
      attempts: 0,
      nextAttemptAt: now,
      requestedByUserId: input.requestedByUserId ?? null,
      payload: {
        appointmentId: input.appointmentId,
        googleEventId: queued.googleEventId,
        action: input.action ?? 'UPSERT',
      },
    },
  });
}

export async function queueAndMaybeProcessAppointmentSync(input: EnqueueAppointmentSyncInput) {
  const queued = await queueAppointmentSync(input);
  if (calendarConfig().configured) {
    await processCalendarSyncQueue({ limit: 1 });
  }
  return queued;
}

async function touchIntegration(
  config: CalendarRuntimeConfig,
  input: { status?: DbCalendarIntegrationStatus; lastError?: string | null } = {},
) {
  if (!config.calendarId) return null;
  return prisma.calendarIntegration.upsert({
    where: {
      provider_calendarId: {
        provider: CalendarProvider.GOOGLE,
        calendarId: config.calendarId,
      },
    },
    create: {
      provider: CalendarProvider.GOOGLE,
      calendarId: config.calendarId,
      authMode: config.authMode === 'oauth' ? 'OAUTH' : 'SERVICE_ACCOUNT',
      status: input.status ?? (config.configured ? DbCalendarIntegrationStatus.ACTIVE : DbCalendarIntegrationStatus.NOT_CONFIGURED),
      lastSyncAt: input.status === DbCalendarIntegrationStatus.ERROR ? null : new Date(),
      lastError: input.lastError ?? null,
    },
    update: {
      authMode: config.authMode === 'oauth' ? 'OAUTH' : 'SERVICE_ACCOUNT',
      status: input.status ?? (config.configured ? DbCalendarIntegrationStatus.ACTIVE : DbCalendarIntegrationStatus.NOT_CONFIGURED),
      lastSyncAt: input.status === DbCalendarIntegrationStatus.ERROR ? undefined : new Date(),
      lastError: input.lastError ?? null,
    },
  });
}

async function markOutboxFailure(
  item: { id: string; attempts: number; appointmentId: string; action: CalendarSyncAction },
  error: unknown,
) {
  const status = googleErrorStatus(error);
  const classification = classifyCalendarError(status);
  const nextAttempts = item.attempts + 1;
  const nextStatus =
    classification === 'conflict' ? CalendarSyncStatus.CONFLICT : CalendarSyncStatus.FAILED;
  const message = googleErrorMessage(error);

  await prisma.calendarSyncOutbox.update({
    where: { id: item.id },
    data: {
      status: nextStatus,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      nextAttemptAt: shouldRetryCalendarError(status) ? retryAt(nextAttempts) : null,
      lastError: message,
      lockedAt: null,
      lockedBy: null,
    },
  });

  await prisma.calendarSyncLog.create({
    data: {
      provider: CalendarProvider.GOOGLE,
      appointmentId: item.appointmentId,
      outboxId: item.id,
      direction: CalendarSyncDirection.OUTBOUND,
      action: item.action,
      status: nextStatus,
      errorCode: String(status),
      message,
    },
  });
}

async function markOutboxSuccess(
  item: { id: string; appointmentId: string; action: CalendarSyncAction },
  message: string,
) {
  await prisma.calendarSyncOutbox.update({
    where: { id: item.id },
    data: {
      status: CalendarSyncStatus.SUCCEEDED,
      lastAttemptAt: new Date(),
      processedAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
    },
  });
  await prisma.calendarSyncLog.create({
    data: {
      provider: CalendarProvider.GOOGLE,
      appointmentId: item.appointmentId,
      outboxId: item.id,
      direction: CalendarSyncDirection.OUTBOUND,
      action: item.action,
      status: CalendarSyncStatus.SUCCEEDED,
      message,
    },
  });
}

async function syncDelete(
  calendar: calendar_v3.Calendar,
  config: CalendarRuntimeConfig,
  item: Prisma.CalendarSyncOutboxGetPayload<{
    include: { appointment: { include: { slot: true } } };
  }>,
) {
  if (!config.calendarId) throw badRequest('Google Calendar ID is missing', 'CALENDAR_NOT_CONFIGURED');
  const eventId = item.googleEventId ?? item.appointment.googleEventId ?? deterministicGoogleEventId(item.appointmentId);

  try {
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId,
    });
  } catch (error) {
    if (googleErrorStatus(error) !== 404 && googleErrorStatus(error) !== 410) throw error;
  }

  await prisma.appointment.update({
    where: { id: item.appointmentId },
    data: {
      googleEventId: eventId,
      googleEventEtag: null,
      googleEventStatus: 'deleted',
      calendarSyncedAt: new Date(),
    },
  });
  await prisma.calendarEventShadow.upsert({
    where: { appointmentId: item.appointmentId },
    create: {
      provider: CalendarProvider.GOOGLE,
      appointmentId: item.appointmentId,
      calendarId: config.calendarId,
      googleEventId: eventId,
      status: CalendarEventShadowStatus.DELETED,
      deletedAt: new Date(),
      lastSyncedAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      status: CalendarEventShadowStatus.DELETED,
      deletedAt: new Date(),
      lastSyncedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
}

async function syncUpsert(
  calendar: calendar_v3.Calendar,
  config: CalendarRuntimeConfig,
  item: Prisma.CalendarSyncOutboxGetPayload<{
    include: { appointment: { include: { slot: true } } };
  }>,
) {
  if (!config.calendarId) throw badRequest('Google Calendar ID is missing', 'CALENDAR_NOT_CONFIGURED');
  const event = buildGoogleEvent({
    appointment: item.appointment,
    timezone: config.timezone,
    durationMinutes: item.appointment.durationMinutes ?? undefined,
  });
  const eventId = item.googleEventId ?? event.id;

  let response: { data: calendar_v3.Schema$Event };
  const requestBody = event as calendar_v3.Schema$Event;
  const existingEventId = item.appointment.googleEventId;

  if (existingEventId) {
    try {
      response = await calendar.events.update({
        calendarId: config.calendarId,
        eventId: existingEventId,
        requestBody,
      });
    } catch (error) {
      if (googleErrorStatus(error) !== 404 && googleErrorStatus(error) !== 410) throw error;
      response = await calendar.events.insert({
        calendarId: config.calendarId,
        requestBody,
      });
    }
  } else {
    try {
      response = await calendar.events.insert({
        calendarId: config.calendarId,
        requestBody,
      });
    } catch (error) {
      if (googleErrorStatus(error) !== 409) throw error;
      response = await calendar.events.update({
        calendarId: config.calendarId,
        eventId,
        requestBody,
      });
    }
  }

  const saved = response.data;
  const savedEventId = saved.id ?? eventId;
  const syncedAt = new Date();
  await prisma.appointment.update({
    where: { id: item.appointmentId },
    data: {
      googleEventId: savedEventId,
      googleEventEtag: saved.etag ?? null,
      googleEventStatus: saved.status ?? event.status,
      calendarSyncedAt: syncedAt,
    },
  });
  await prisma.calendarEventShadow.upsert({
    where: { appointmentId: item.appointmentId },
    create: {
      provider: CalendarProvider.GOOGLE,
      appointmentId: item.appointmentId,
      calendarId: config.calendarId,
      googleEventId: savedEventId,
      etag: saved.etag ?? null,
      status:
        saved.status === 'cancelled'
          ? CalendarEventShadowStatus.CANCELLED
          : CalendarEventShadowStatus.ACTIVE,
      htmlLink: saved.htmlLink ?? null,
      recurringEventId: saved.recurringEventId ?? null,
      payload: saved as Prisma.InputJsonValue,
      lastSyncedAt: syncedAt,
      lastSeenAt: syncedAt,
      deletedAt: null,
    },
    update: {
      googleEventId: savedEventId,
      etag: saved.etag ?? null,
      status:
        saved.status === 'cancelled'
          ? CalendarEventShadowStatus.CANCELLED
          : CalendarEventShadowStatus.ACTIVE,
      htmlLink: saved.htmlLink ?? null,
      recurringEventId: saved.recurringEventId ?? null,
      payload: saved as Prisma.InputJsonValue,
      lastSyncedAt: syncedAt,
      lastSeenAt: syncedAt,
      deletedAt: null,
    },
  });
}

export async function processCalendarSyncQueue({
  limit = 25,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}): Promise<CalendarSyncProcessResult> {
  const config = calendarConfig();
  if (!config.configured) {
    const queuedCount = await prisma.calendarSyncOutbox.count({
      where: { provider: CalendarProvider.GOOGLE, status: CalendarSyncStatus.QUEUED },
    });
    return {
      configured: false,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      conflictCount: 0,
      queuedCount,
    };
  }

  const calendar = googleCalendarApi(config);
  await touchIntegration(config, { status: DbCalendarIntegrationStatus.ACTIVE, lastError: null });
  const items = await prisma.calendarSyncOutbox.findMany({
    where: {
      provider: CalendarProvider.GOOGLE,
      status: { in: RETRYABLE_SYNC_STATUSES },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { appointment: { include: { slot: true } } },
  });

  let succeededCount = 0;
  let failedCount = 0;
  let conflictCount = 0;

  for (const item of items) {
    await prisma.calendarSyncOutbox.update({
      where: { id: item.id },
      data: {
        status: CalendarSyncStatus.PROCESSING,
        lockedAt: new Date(),
        lockedBy: process.env.RENDER_INSTANCE_ID ?? process.env.HOSTNAME ?? 'api',
      },
    });

    try {
      if (item.action === CalendarSyncAction.DELETE) {
        await syncDelete(calendar, config, item);
        await markOutboxSuccess(item, 'Google Calendar event deleted');
      } else {
        await syncUpsert(calendar, config, item);
        await markOutboxSuccess(item, 'Google Calendar event synced');
      }
      succeededCount += 1;
    } catch (error) {
      const classification = classifyCalendarError(googleErrorStatus(error));
      if (classification === 'conflict') conflictCount += 1;
      else failedCount += 1;
      await markOutboxFailure(item, error);
      await touchIntegration(config, {
        status: classification === 'auth' ? DbCalendarIntegrationStatus.ERROR : DbCalendarIntegrationStatus.ACTIVE,
        lastError: googleErrorMessage(error),
      });
    }
  }

  const queuedCount = await prisma.calendarSyncOutbox.count({
    where: { provider: CalendarProvider.GOOGLE, status: CalendarSyncStatus.QUEUED },
  });

  return {
    configured: true,
    processedCount: items.length,
    succeededCount,
    failedCount,
    conflictCount,
    queuedCount,
  };
}

export async function retryFailedCalendarSyncs(limit = 25) {
  await prisma.calendarSyncOutbox.updateMany({
    where: {
      provider: CalendarProvider.GOOGLE,
      status: { in: [CalendarSyncStatus.FAILED, CalendarSyncStatus.CONFLICT] },
    },
    data: {
      status: CalendarSyncStatus.QUEUED,
      nextAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });

  return processCalendarSyncQueue({ limit });
}

export async function listCalendarConflicts(limit = 50) {
  return prisma.calendarSyncOutbox.findMany({
    where: {
      provider: CalendarProvider.GOOGLE,
      status: CalendarSyncStatus.CONFLICT,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      appointment: {
        include: { slot: true, employee: { select: { id: true, employeeNo: true } } },
      },
    },
  });
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
