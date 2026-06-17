import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGoogleEvent,
  classifyCalendarError,
  deterministicGoogleEventId,
  handleGoogleCalendarWebhook,
  shouldRetryCalendarError,
} from './calendarIntegration.service';

const appointmentId = '123E4567-E89B-12D3-A456-426614174000';
const slotId = '223e4567-e89b-12d3-a456-426614174111';

describe('calendar integration service', () => {
  afterEach(() => {
    delete process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN;
  });

  it('creates deterministic Google-safe event ids from appointment ids', () => {
    const first = deterministicGoogleEventId(appointmentId);
    const second = deterministicGoogleEventId(appointmentId.toLowerCase());

    expect(first).toBe('hrms123e4567e89b12d3a456426614174000');
    expect(second).toBe(first);
    expect(first).toMatch(/^[a-v0-9]+$/);
    expect(first.length).toBeGreaterThanOrEqual(5);
    expect(first.length).toBeLessThanOrEqual(1024);
  });

  it('maps a pending HRMS appointment to a tentative Google event with timezone metadata', () => {
    const event = buildGoogleEvent({
      appointment: {
        id: appointmentId,
        slotId,
        purpose: 'Benefits counseling',
        scheduledDate: '2026-06-20',
        scheduledTime: '09:30',
        status: 'PENDING',
        note: 'Bring government IDs',
        slot: {
          location: 'HR Office',
        },
      },
      timezone: 'Asia/Manila',
      durationMinutes: 45,
      environment: 'test',
    });

    expect(event).toMatchObject({
      id: 'hrms123e4567e89b12d3a456426614174000',
      summary: 'Benefits counseling',
      description: 'Bring government IDs',
      location: 'HR Office',
      status: 'tentative',
      start: {
        dateTime: '2026-06-20T09:30:00+08:00',
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: '2026-06-20T10:15:00+08:00',
        timeZone: 'Asia/Manila',
      },
      extendedProperties: {
        private: {
          hrmsAppointmentId: appointmentId,
          hrmsSlotId: slotId,
          hrmsEnvironment: 'test',
          hrmsSyncVersion: '1',
        },
      },
    });
  });

  it('maps approved and completed HRMS appointments to confirmed Google events', () => {
    const approved = buildGoogleEvent({
      appointment: {
        id: appointmentId,
        purpose: 'Interview',
        scheduledDate: new Date('2026-06-20T00:00:00.000Z'),
        scheduledTime: '14:00',
        status: 'APPROVED',
      },
      timezone: 'Asia/Manila',
    });
    const completed = buildGoogleEvent({
      appointment: {
        id: '323e4567-e89b-12d3-a456-426614174222',
        purpose: 'Exit interview',
        scheduledDate: '2026-06-21',
        scheduledTime: '16:00',
        status: 'COMPLETED',
      },
      timezone: 'Asia/Manila',
    });

    expect(approved.status).toBe('confirmed');
    expect(approved.end.dateTime).toBe('2026-06-20T14:30:00+08:00');
    expect(completed.status).toBe('confirmed');
  });

  it('classifies Google Calendar API errors for retry, reset, conflict, permanent, and auth handling', () => {
    expect(classifyCalendarError(429)).toBe('retry');
    expect(classifyCalendarError(500)).toBe('retry');
    expect(classifyCalendarError(410)).toBe('sync-reset');
    expect(classifyCalendarError(412)).toBe('conflict');
    expect(classifyCalendarError(400)).toBe('permanent');
    expect(classifyCalendarError(401)).toBe('auth');
  });

  it('only retries retryable Google Calendar API errors', () => {
    expect(shouldRetryCalendarError(429)).toBe(true);
    expect(shouldRetryCalendarError(503)).toBe(true);
    expect(shouldRetryCalendarError(400)).toBe(false);
    expect(shouldRetryCalendarError(401)).toBe(false);
    expect(shouldRetryCalendarError(410)).toBe(false);
    expect(shouldRetryCalendarError(412)).toBe(false);
  });

  it('rejects Google Calendar webhooks with a bad channel token', () => {
    process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN = 'expected-token';

    let error: unknown;
    try {
      handleGoogleCalendarWebhook({ 'x-goog-channel-token': 'wrong-token' });
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('accepts Google Calendar webhooks with the configured channel token', () => {
    process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN = 'expected-token';

    expect(handleGoogleCalendarWebhook({ 'x-goog-channel-token': 'expected-token' })).toEqual({
      accepted: true,
    });
  });
});
