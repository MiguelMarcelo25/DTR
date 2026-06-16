import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  idParamSchema,
  overtimeListQuerySchema,
  createOvertimeSchema,
  rejectOvertimeSchema,
} from '../validations/overtime.validation';
import {
  listOvertimeController,
  createOvertimeController,
  approveOvertimeController,
  rejectOvertimeController,
  cancelOvertimeController,
} from '../controllers/overtime.controller';

const router = Router();

// ── List & create (self-scoped; privileged see all) ──
router.get('/', authenticate, validate({ query: overtimeListQuerySchema }), listOvertimeController);
router.post('/', authenticate, validate({ body: createOvertimeSchema }), createOvertimeController);

// ── Review (privileged) ──
router.put(
  '/:id/approve',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema }),
  approveOvertimeController,
);
router.put(
  '/:id/reject',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: rejectOvertimeSchema }),
  rejectOvertimeController,
);

// ── Cancel (owner; ownership enforced in service) ──
router.put(
  '/:id/cancel',
  authenticate,
  validate({ params: idParamSchema }),
  cancelOvertimeController,
);

export default router;
