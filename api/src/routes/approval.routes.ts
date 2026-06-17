import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  actOnApprovalController,
  getApprovalController,
  getApprovalInboxController,
} from '../controllers/approval.controller';
import {
  approvalActionSchema,
  approvalIdParamSchema,
  approvalInboxQuerySchema,
} from '../validations/approval.validation';

const router = Router();

router.get(
  '/inbox',
  authenticate,
  validate({ query: approvalInboxQuerySchema }),
  getApprovalInboxController,
);

router.get(
  '/:id',
  authenticate,
  validate({ params: approvalIdParamSchema }),
  getApprovalController,
);

router.post(
  '/:id/actions',
  authenticate,
  validate({ params: approvalIdParamSchema, body: approvalActionSchema }),
  actOnApprovalController,
);

export default router;
