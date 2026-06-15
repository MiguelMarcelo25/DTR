import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import { listAuditLogsSchema, auditLogIdSchema } from '../validations/audit.validation';
import {
  listAuditLogsController,
  getAuditLogController,
} from '../controllers/audit.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: listAuditLogsSchema }),
  listAuditLogsController,
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: auditLogIdSchema }),
  getAuditLogController,
);

export default router;
