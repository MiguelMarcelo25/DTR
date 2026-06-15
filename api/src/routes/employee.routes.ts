import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  employeeIdParamSchema,
  listEmployeesQuerySchema,
  createEmployeeSchema,
  updateEmployeeSchema,
} from '../validations/employee.validation';
import {
  listEmployeesController,
  createEmployeeController,
  getEmployeeController,
  updateEmployeeController,
  deleteEmployeeController,
  deactivateEmployeeController,
  archiveEmployeeController,
  exportMasterlistController,
} from '../controllers/employee.controller';

const router = Router();

// Specific paths BEFORE /:id to avoid being captured by the param route.
router.get(
  '/export/masterlist',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  exportMasterlistController,
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ query: listEmployeesQuerySchema }),
  listEmployeesController,
);

// Only the Super Admin may create employee accounts + input their details.
router.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate({ body: createEmployeeSchema }),
  createEmployeeController,
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE),
  validate({ params: employeeIdParamSchema }),
  getEmployeeController,
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParamSchema, body: updateEmployeeSchema }),
  updateEmployeeController,
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: employeeIdParamSchema }),
  deleteEmployeeController,
);

router.put(
  '/:id/deactivate',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: employeeIdParamSchema }),
  deactivateEmployeeController,
);

router.put(
  '/:id/archive',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate({ params: employeeIdParamSchema }),
  archiveEmployeeController,
);

export default router;
