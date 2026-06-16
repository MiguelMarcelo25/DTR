import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  idParamSchema,
  listHolidaysSchema,
  createHolidaySchema,
  updateHolidaySchema,
} from '../validations/holiday.validation';
import {
  listHolidaysController,
  createHolidayController,
  updateHolidayController,
  deleteHolidayController,
} from '../controllers/holiday.controller';

const router = Router();

// Any authenticated staff may read the holiday calendar.
router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE),
  validate({ query: listHolidaysSchema }),
  listHolidaysController,
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ body: createHolidaySchema }),
  createHolidayController,
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema, body: updateHolidaySchema }),
  updateHolidayController,
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: idParamSchema }),
  deleteHolidayController,
);

export default router;
