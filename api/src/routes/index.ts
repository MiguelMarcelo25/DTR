import { Router } from 'express';

import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import profileRoutes, { profileUpdateRequestRouter } from './profile.routes';
import attendanceRoutes from './attendance.routes';
import leaveRoutes from './leave.routes';
import appointmentRoutes, { appointmentSlotRouter } from './appointment.routes';
import payrollRoutes, { payslipRouter } from './payroll.routes';
import dashboardRoutes from './dashboard.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';
import auditRoutes from './audit.routes';
import supportRoutes from './support.routes';
import holidayRoutes from './holiday.routes';
import overtimeRoutes from './overtime.routes';
import {
  departmentRouter,
  positionRouter,
  branchRouter,
  scheduleRouter,
  roleRouter,
  userRouter,
} from './org.routes';

const api = Router();

api.use('/auth', authRoutes);

// Employee core + profile/background sub-resources (both mounted at /employees)
api.use('/employees', employeeRoutes);
api.use('/employees', profileRoutes);
api.use('/profile-update-requests', profileUpdateRequestRouter);

api.use('/attendance', attendanceRoutes);
api.use('/leave', leaveRoutes);

api.use('/appointments', appointmentRoutes);
api.use('/appointment-slots', appointmentSlotRouter);

api.use('/payroll', payrollRoutes);
api.use('/payslips', payslipRouter);

api.use('/dashboard', dashboardRoutes);
api.use('/notifications', notificationRoutes);
api.use('/reports', reportRoutes);
api.use('/audit-logs', auditRoutes);
api.use('/support', supportRoutes);
api.use('/holidays', holidayRoutes);
api.use('/overtime', overtimeRoutes);

// Org structure + user administration (lookups for selects + admin CRUD)
api.use('/departments', departmentRouter);
api.use('/positions', positionRouter);
api.use('/branches', branchRouter);
api.use('/schedules', scheduleRouter);
api.use('/roles', roleRouter);
api.use('/users', userRouter);

export default api;
