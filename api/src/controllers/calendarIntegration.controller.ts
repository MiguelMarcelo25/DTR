import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as calendarIntegrationService from '../services/calendarIntegration.service';
import type {
  RetryFailedInput,
  SyncNowInput,
} from '../validations/calendarIntegration.validation';

export const getCalendarIntegrationStatusController = asyncHandler(
  async (_req: Request, res: Response) => {
    const status = await calendarIntegrationService.getCalendarIntegrationStatus();
    return ok(res, status, 'Calendar integration status');
  },
);

export const syncNowController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SyncNowInput;
  if (body.appointmentId) {
    await calendarIntegrationService.queueAppointmentSync({
      appointmentId: body.appointmentId,
      requestedByUserId: req.user!.id,
    });
  }
  const result = await calendarIntegrationService.processCalendarSyncQueue({
    limit: body.appointmentId ? 1 : 25,
  });

  return ok(res, result, 'Calendar sync queued', 202);
});

export const retryFailedController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RetryFailedInput;
  const result = await calendarIntegrationService.retryFailedCalendarSyncs(body.limit ?? 25);
  return ok(res, result, 'Calendar retry queued', 202);
});

export const listConflictsController = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await calendarIntegrationService.listCalendarConflicts(), 'Calendar conflicts');
});

export const googleCalendarWebhookController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = calendarIntegrationService.handleGoogleCalendarWebhook(req.headers);
    return ok(res, result, 'Google Calendar webhook accepted');
  },
);
