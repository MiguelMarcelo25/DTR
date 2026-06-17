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
    const status = calendarIntegrationService.getCalendarIntegrationStatus();
    return ok(res, status, 'Calendar integration status');
  },
);

export const syncNowController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SyncNowInput;
  const result = body.appointmentId
    ? calendarIntegrationService.enqueueAppointmentSync({
        appointmentId: body.appointmentId,
        requestedByUserId: req.user!.id,
      })
    : {
        accepted: true,
        queuedCount: 0,
        message: 'Calendar sync queue is not database-backed yet',
      };

  return ok(res, result, 'Calendar sync queued', 202);
});

export const retryFailedController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RetryFailedInput;
  return ok(
    res,
    {
      accepted: true,
      queuedCount: 0,
      limit: body.limit ?? 25,
      message: 'Calendar retry queue is not database-backed yet',
    },
    'Calendar retry queued',
    202,
  );
});

export const listConflictsController = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, [], 'Calendar conflicts');
});

export const googleCalendarWebhookController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = calendarIntegrationService.handleGoogleCalendarWebhook(req.headers);
    return ok(res, result, 'Google Calendar webhook accepted');
  },
);
