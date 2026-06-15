import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  idParamSchema,
  employeeIdParamSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeaveRequestSchema,
  listLeaveRequestsSchema,
  reviewLeaveRequestSchema,
  rejectLeaveRequestSchema,
  listLeaveBalancesSchema,
  getEmployeeBalancesSchema,
  adjustLeaveBalanceSchema,
  leaveReportSchema,
} from '../validations/leave.validation';
import {
  listLeaveTypesController,
  createLeaveTypeController,
  updateLeaveTypeController,
  deleteLeaveTypeController,
  listLeaveRequestsController,
  createLeaveRequestController,
  getLeaveRequestController,
  cancelLeaveRequestController,
  approveLeaveRequestController,
  rejectLeaveRequestController,
  listLeaveBalancesController,
  getEmployeeBalancesController,
  adjustLeaveBalanceController,
  leaveReportController,
  leaveReportExportController,
} from '../controllers/leave.controller';

const router = Router();

// ── Leave types ───────────────────────────────────────────────
router.get('/types', authenticate, listLeaveTypesController);

router.post(
  '/types',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ body: createLeaveTypeSchema }),
  createLeaveTypeController,
);

router.put(
  '/types/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: updateLeaveTypeSchema }),
  updateLeaveTypeController,
);

router.delete(
  '/types/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema }),
  deleteLeaveTypeController,
);

// ── Reports (declared before /requests/:id-style routes; distinct prefix) ──
router.get(
  '/reports/export',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: leaveReportSchema }),
  leaveReportExportController,
);

router.get(
  '/reports',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: leaveReportSchema }),
  leaveReportController,
);

// ── Leave balances ────────────────────────────────────────────
router.get(
  '/balances',
  authenticate,
  validate({ query: listLeaveBalancesSchema }),
  listLeaveBalancesController,
);

router.get(
  '/balances/:employeeId',
  authenticate,
  validate({ params: employeeIdParamSchema, query: getEmployeeBalancesSchema }),
  getEmployeeBalancesController,
);

router.put(
  '/balances/:employeeId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParamSchema, body: adjustLeaveBalanceSchema }),
  adjustLeaveBalanceController,
);

// ── Leave requests ────────────────────────────────────────────
router.get(
  '/requests',
  authenticate,
  validate({ query: listLeaveRequestsSchema }),
  listLeaveRequestsController,
);

router.post(
  '/requests',
  authenticate,
  validate({ body: createLeaveRequestSchema }),
  createLeaveRequestController,
);

router.get(
  '/requests/:id',
  authenticate,
  validate({ params: idParamSchema }),
  getLeaveRequestController,
);

router.put(
  '/requests/:id/cancel',
  authenticate,
  validate({ params: idParamSchema }),
  cancelLeaveRequestController,
);

router.put(
  '/requests/:id/approve',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: reviewLeaveRequestSchema }),
  approveLeaveRequestController,
);

router.put(
  '/requests/:id/reject',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: rejectLeaveRequestSchema }),
  rejectLeaveRequestController,
);

export default router;
