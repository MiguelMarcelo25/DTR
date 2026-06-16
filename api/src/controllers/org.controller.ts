import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, noContent } from '../utils/response';
import * as org from '../services/org.service';

// ── Departments ──
export const listDepartmentsCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.listDepartments(req.query.search as string | undefined)),
);
export const createDepartmentCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await org.createDepartment(req, req.body)),
);
export const updateDepartmentCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.updateDepartment(req, req.params.id, req.body)),
);
export const deleteDepartmentCtrl = asyncHandler(async (req: Request, res: Response) => {
  await org.deleteDepartment(req, req.params.id);
  return noContent(res);
});

// ── Positions ──
export const listPositionsCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.listPositions(req.query.search as string | undefined)),
);
export const createPositionCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await org.createPosition(req, req.body)),
);
export const updatePositionCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.updatePosition(req, req.params.id, req.body)),
);
export const deletePositionCtrl = asyncHandler(async (req: Request, res: Response) => {
  await org.deletePosition(req, req.params.id);
  return noContent(res);
});

// ── Branches ──
export const listBranchesCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.listBranches(req.query.search as string | undefined)),
);
export const createBranchCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await org.createBranch(req, req.body)),
);
export const updateBranchCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.updateBranch(req, req.params.id, req.body)),
);
export const deleteBranchCtrl = asyncHandler(async (req: Request, res: Response) => {
  await org.deleteBranch(req, req.params.id);
  return noContent(res);
});

// ── Schedules ──
export const listSchedulesCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.listSchedules(req.query.search as string | undefined)),
);
export const createScheduleCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await org.createSchedule(req, req.body)),
);
export const updateScheduleCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.updateSchedule(req, req.params.id, req.body)),
);
export const deleteScheduleCtrl = asyncHandler(async (req: Request, res: Response) => {
  await org.deleteSchedule(req, req.params.id);
  return noContent(res);
});

// ── Roles ──
export const listRolesCtrl = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await org.listRoles()),
);

// ── Users ──
export const listUsersCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await org.listUsers(req.query);
  return res.status(200).json({ success: true, message: 'OK', data: items, meta });
});
export const createUserCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await org.createUser(req, req.body)),
);
export const updateUserCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await org.updateUser(req, req.params.id, req.body)),
);

export const listLinkableEmployeesCtrl = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await org.listLinkableEmployees()),
);
