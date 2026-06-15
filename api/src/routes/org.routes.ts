import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import {
  idParam,
  departmentSchema,
  positionSchema,
  branchSchema,
  scheduleSchema,
  createUserSchema,
  updateUserSchema,
} from '../validations/org.validation';
import * as c from '../controllers/org.controller';

const readRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR] as const;
const writeRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN] as const;

// ── Departments ──
export const departmentRouter = Router();
departmentRouter.use(authenticate);
departmentRouter.get('/', authorize(...readRoles), c.listDepartmentsCtrl);
departmentRouter.post('/', authorize(...writeRoles), validate({ body: departmentSchema }), c.createDepartmentCtrl);
departmentRouter.put('/:id', authorize(...writeRoles), validate({ params: idParam, body: departmentSchema.partial() }), c.updateDepartmentCtrl);
departmentRouter.delete('/:id', authorize(...writeRoles), validate({ params: idParam }), c.deleteDepartmentCtrl);

// ── Positions ──
export const positionRouter = Router();
positionRouter.use(authenticate);
positionRouter.get('/', authorize(...readRoles), c.listPositionsCtrl);
positionRouter.post('/', authorize(...writeRoles), validate({ body: positionSchema }), c.createPositionCtrl);
positionRouter.put('/:id', authorize(...writeRoles), validate({ params: idParam, body: positionSchema.partial() }), c.updatePositionCtrl);
positionRouter.delete('/:id', authorize(...writeRoles), validate({ params: idParam }), c.deletePositionCtrl);

// ── Branches ──
export const branchRouter = Router();
branchRouter.use(authenticate);
branchRouter.get('/', authorize(...readRoles), c.listBranchesCtrl);
branchRouter.post('/', authorize(...writeRoles), validate({ body: branchSchema }), c.createBranchCtrl);
branchRouter.put('/:id', authorize(...writeRoles), validate({ params: idParam, body: branchSchema.partial() }), c.updateBranchCtrl);
branchRouter.delete('/:id', authorize(...writeRoles), validate({ params: idParam }), c.deleteBranchCtrl);

// ── Schedules ──
export const scheduleRouter = Router();
scheduleRouter.use(authenticate);
scheduleRouter.get('/', authorize(...readRoles), c.listSchedulesCtrl);
scheduleRouter.post('/', authorize(...writeRoles), validate({ body: scheduleSchema }), c.createScheduleCtrl);
scheduleRouter.put('/:id', authorize(...writeRoles), validate({ params: idParam, body: scheduleSchema.partial() }), c.updateScheduleCtrl);
scheduleRouter.delete('/:id', authorize(...writeRoles), validate({ params: idParam }), c.deleteScheduleCtrl);

// ── Roles ──
export const roleRouter = Router();
roleRouter.use(authenticate);
roleRouter.get('/', authorize(...readRoles), c.listRolesCtrl);

// ── Users ──
export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get('/', authorize(...writeRoles), c.listUsersCtrl);
// Only the Super Admin may create login accounts.
userRouter.post('/', authorize(ROLES.SUPER_ADMIN), validate({ body: createUserSchema }), c.createUserCtrl);
userRouter.put('/:id', authorize(...writeRoles), validate({ params: idParam, body: updateUserSchema }), c.updateUserCtrl);
