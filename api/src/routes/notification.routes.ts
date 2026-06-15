import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from '../validations/notification.validation';
import {
  listNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
  deleteNotificationController,
} from '../controllers/notification.controller';

const router = Router();

// Every notification is scoped to the requesting user's own id, so any
// authenticated role may use these endpoints.
const ANY_ROLE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE] as const;

router.get(
  '/',
  authenticate,
  authorize(...ANY_ROLE),
  validate({ query: listNotificationsSchema }),
  listNotificationsController,
);

router.put(
  '/read-all',
  authenticate,
  authorize(...ANY_ROLE),
  markAllNotificationsReadController,
);

router.put(
  '/:id/read',
  authenticate,
  authorize(...ANY_ROLE),
  validate({ params: notificationIdParamSchema }),
  markNotificationReadController,
);

router.delete(
  '/:id',
  authenticate,
  authorize(...ANY_ROLE),
  validate({ params: notificationIdParamSchema }),
  deleteNotificationController,
);

export default router;
