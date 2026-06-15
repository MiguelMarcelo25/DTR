import { Router } from 'express';
import { ROLES } from '../config/constants';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  idParamSchema,
  listSlotsQuerySchema,
  createSlotSchema,
  updateSlotSchema,
  listAppointmentsQuerySchema,
  calendarQuerySchema,
  reportsQuerySchema,
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  approveAppointmentSchema,
  rejectAppointmentSchema,
  completeAppointmentSchema,
} from '../validations/appointment.validation';
import {
  listSlotsController,
  createSlotController,
  updateSlotController,
  deleteSlotController,
  listAppointmentsController,
  calendarController,
  reportsController,
  getAppointmentController,
  bookAppointmentController,
  rescheduleAppointmentController,
  cancelAppointmentController,
  approveAppointmentController,
  rejectAppointmentController,
  completeAppointmentController,
} from '../controllers/appointment.controller';

// ─────────────────────────────────────────────────────────────
// /appointment-slots
// ─────────────────────────────────────────────────────────────

export const appointmentSlotRouter = Router();

appointmentSlotRouter.get(
  '/',
  authenticate,
  validate({ query: listSlotsQuerySchema }),
  listSlotsController,
);

appointmentSlotRouter.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ body: createSlotSchema }),
  createSlotController,
);

appointmentSlotRouter.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: updateSlotSchema }),
  updateSlotController,
);

appointmentSlotRouter.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema }),
  deleteSlotController,
);

// ─────────────────────────────────────────────────────────────
// /appointments
// ─────────────────────────────────────────────────────────────

const router = Router();

router.get(
  '/',
  authenticate,
  validate({ query: listAppointmentsQuerySchema }),
  listAppointmentsController,
);

router.post(
  '/',
  authenticate,
  validate({ body: bookAppointmentSchema }),
  bookAppointmentController,
);

// Static routes must come BEFORE the dynamic /:id route.
router.get(
  '/calendar',
  authenticate,
  validate({ query: calendarQuerySchema }),
  calendarController,
);

router.get(
  '/reports',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: reportsQuerySchema }),
  reportsController,
);

router.get(
  '/:id',
  authenticate,
  validate({ params: idParamSchema }),
  getAppointmentController,
);

router.put(
  '/:id/reschedule',
  authenticate,
  validate({ params: idParamSchema, body: rescheduleAppointmentSchema }),
  rescheduleAppointmentController,
);

router.put(
  '/:id/cancel',
  authenticate,
  validate({ params: idParamSchema, body: cancelAppointmentSchema }),
  cancelAppointmentController,
);

router.put(
  '/:id/approve',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: approveAppointmentSchema }),
  approveAppointmentController,
);

router.put(
  '/:id/reject',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: rejectAppointmentSchema }),
  rejectAppointmentController,
);

router.put(
  '/:id/complete',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: idParamSchema, body: completeAppointmentSchema }),
  completeAppointmentController,
);

export default router;
