import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  adminDashboardQuerySchema,
  hrDashboardQuerySchema,
} from '../validations/dashboard.validation';
import {
  employeeDashboardController,
  adminDashboardController,
  hrDashboardController,
} from '../controllers/dashboard.controller';

const router = Router();

// Employee self-service dashboard — any authenticated user (scope enforced in service).
router.get('/employee', authenticate, employeeDashboardController);

// Admin overview — Super Admin / Admin only.
router.get(
  '/admin',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ query: adminDashboardQuerySchema }),
  adminDashboardController,
);

// HR overview — Super Admin / Admin / HR.
router.get(
  '/hr',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: hrDashboardQuerySchema }),
  hrDashboardController,
);

export default router;
