import type { Request, Response } from 'express';
import type { RequestStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, paginated } from '../utils/response';
import * as overtimeService from '../services/overtime.service';

export const listOvertimeController = asyncHandler(async (req: Request, res: Response) => {
  const { status, employeeId } = req.query as {
    status?: RequestStatus;
    employeeId?: string;
  };
  const { items, meta } = await overtimeService.list(req.user!, req.query, { status, employeeId });
  return paginated(res, items, meta, 'Overtime requests');
});

export const createOvertimeController = asyncHandler(async (req: Request, res: Response) => {
  const overtime = await overtimeService.create(req, req.user!, req.body);
  return created(res, overtime, 'Overtime request submitted');
});

export const approveOvertimeController = asyncHandler(async (req: Request, res: Response) => {
  const overtime = await overtimeService.approve(req, req.user!, req.params.id);
  return ok(res, overtime, 'Overtime approved');
});

export const rejectOvertimeController = asyncHandler(async (req: Request, res: Response) => {
  const overtime = await overtimeService.reject(req, req.user!, req.params.id, req.body.reviewNote);
  return ok(res, overtime, 'Overtime rejected');
});

export const cancelOvertimeController = asyncHandler(async (req: Request, res: Response) => {
  const overtime = await overtimeService.cancel(req, req.user!, req.params.id);
  return ok(res, overtime, 'Overtime cancelled');
});
