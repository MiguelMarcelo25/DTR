import { Router } from 'express';
import { ROLES } from '../config/constants';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  getCalendarIntegrationStatusController,
  googleCalendarWebhookController,
  listConflictsController,
  retryFailedController,
  syncNowController,
} from '../controllers/calendarIntegration.controller';
import {
  retryFailedSchema,
  syncNowSchema,
} from '../validations/calendarIntegration.validation';

const router = Router();
const calendarAdmins = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR] as const;

router.get(
  '/status',
  authenticate,
  authorize(...calendarAdmins),
  getCalendarIntegrationStatusController,
);

router.post(
  '/sync-now',
  authenticate,
  authorize(...calendarAdmins),
  validate({ body: syncNowSchema }),
  syncNowController,
);

router.post(
  '/retry-failed',
  authenticate,
  authorize(...calendarAdmins),
  validate({ body: retryFailedSchema }),
  retryFailedController,
);

router.get(
  '/conflicts',
  authenticate,
  authorize(...calendarAdmins),
  listConflictsController,
);

export const googleCalendarWebhookRouter = Router();

googleCalendarWebhookRouter.post('/webhook', googleCalendarWebhookController);

export default router;
