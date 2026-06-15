import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  idParamSchema,
  processPayrollSchema,
  listPeriodsQuerySchema,
  payrollReportsQuerySchema,
  listPayslipsQuerySchema,
} from '../validations/payroll.validation';
import {
  processPayrollController,
  listPeriodsController,
  getPeriodController,
  recalculatePeriodController,
  releasePeriodController,
  cancelPeriodController,
  getPeriodPayslipsController,
  getReportsController,
  exportReportsController,
  listPayslipsController,
  getPayslipController,
  downloadPayslipController,
} from '../controllers/payroll.controller';

// ── /payroll — processing & administration (PAYROLL_ROLES only) ──
const router = Router();

router.post(
  '/process',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ body: processPayrollSchema }),
  processPayrollController,
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ query: listPeriodsQuerySchema }),
  listPeriodsController,
);

// Reports — declared before "/:id" so the literal paths win.
router.get(
  '/reports',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ query: payrollReportsQuerySchema }),
  getReportsController,
);

router.get(
  '/reports/export',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ query: payrollReportsQuerySchema }),
  exportReportsController,
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  getPeriodController,
);

router.put(
  '/:id/recalculate',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  recalculatePeriodController,
);

router.put(
  '/:id/release',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  releasePeriodController,
);

router.put(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  cancelPeriodController,
);

router.get(
  '/:id/payslips',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  getPeriodPayslipsController,
);

// ── /payslips — employee self-service + privileged access ──
export const payslipRouter = Router();

payslipRouter.get(
  '/',
  authenticate,
  validate({ query: listPayslipsQuerySchema }),
  listPayslipsController,
);

payslipRouter.get(
  '/:id',
  authenticate,
  validate({ params: idParamSchema }),
  getPayslipController,
);

payslipRouter.get(
  '/:id/download',
  authenticate,
  validate({ params: idParamSchema }),
  downloadPayslipController,
);

export default router;
