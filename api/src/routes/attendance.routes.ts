import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES, STAFF_ROLES } from '../config/constants';
import {
  idParamSchema,
  timeOutSchema,
  attendanceListQuerySchema,
  attendanceHistoryQuerySchema,
  monthlyDtrQuerySchema,
  summaryQuerySchema,
  createCorrectionSchema,
  correctionListQuerySchema,
  approveCorrectionSchema,
  rejectCorrectionSchema,
  reportQuerySchema,
} from '../validations/attendance.validation';
import {
  timeInController,
  timeOutController,
  breakInController,
  breakOutController,
  activityController,
  listLogsController,
  historyController,
  monthlyDtrController,
  summaryController,
  createCorrectionController,
  listCorrectionsController,
  approveCorrectionController,
  rejectCorrectionController,
  reportController,
  reportExportController,
} from '../controllers/attendance.controller';

const router = Router();

// ── Punches (self employee) ──
router.post('/time-in', authenticate, timeInController);
router.post('/time-out', authenticate, validate({ body: timeOutSchema }), timeOutController);
router.post('/break-in', authenticate, breakInController);
router.post('/break-out', authenticate, breakOutController);

// ── Team activity feed (recent time-out summaries) ──
router.get('/activity', authenticate, authorize(...STAFF_ROLES), activityController);

// ── Self reads ──
router.get(
  '/history',
  authenticate,
  validate({ query: attendanceHistoryQuerySchema }),
  historyController,
);
router.get(
  '/monthly-dtr',
  authenticate,
  validate({ query: monthlyDtrQuerySchema }),
  monthlyDtrController,
);
router.get('/summary', authenticate, validate({ query: summaryQuerySchema }), summaryController);

// ── Corrections ──
router.post(
  '/corrections',
  authenticate,
  validate({ body: createCorrectionSchema }),
  createCorrectionController,
);
router.get(
  '/corrections',
  authenticate,
  validate({ query: correctionListQuerySchema }),
  listCorrectionsController,
);
router.put(
  '/corrections/:id/approve',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: approveCorrectionSchema }),
  approveCorrectionController,
);
router.put(
  '/corrections/:id/reject',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: rejectCorrectionSchema }),
  rejectCorrectionController,
);

// ── Reports (privileged) ──
router.get(
  '/reports/export',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: reportQuerySchema }),
  reportExportController,
);
router.get(
  '/reports',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: reportQuerySchema }),
  reportController,
);

// ── Privileged logs list (also served at /logs) ──
router.get(
  '/logs',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: attendanceListQuerySchema }),
  listLogsController,
);
router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: attendanceListQuerySchema }),
  listLogsController,
);

export default router;
