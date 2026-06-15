import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import { reportQuerySchema, exportQuerySchema } from '../validations/report.validation';
import {
  attendanceReportController,
  dtrReportController,
  lateReportController,
  undertimeReportController,
  absencesReportController,
  leaveReportController,
  appointmentsReportController,
  payrollReportController,
  employeesReportController,
  employeeBackgroundReportController,
  exportReportController,
} from '../controllers/report.controller';

const router = Router();

// All reports are restricted to privileged roles.
const guard = [authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR)] as const;
const withQuery = validate({ query: reportQuerySchema });

// Attendance-derived
router.get('/attendance', ...guard, withQuery, attendanceReportController);
router.get('/dtr', ...guard, withQuery, dtrReportController);
router.get('/late', ...guard, withQuery, lateReportController);
router.get('/undertime', ...guard, withQuery, undertimeReportController);
router.get('/absences', ...guard, withQuery, absencesReportController);

// Leave
router.get('/leave', ...guard, withQuery, leaveReportController);

// Appointments
router.get('/appointments', ...guard, withQuery, appointmentsReportController);

// Payroll
router.get('/payroll', ...guard, withQuery, payrollReportController);

// Employees
router.get('/employees', ...guard, withQuery, employeesReportController);
router.get('/employee-background', ...guard, withQuery, employeeBackgroundReportController);

// Generic exporter (type + format)
router.get('/export', ...guard, validate({ query: exportQuerySchema }), exportReportController);

export default router;
