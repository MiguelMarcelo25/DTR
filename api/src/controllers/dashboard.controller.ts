import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as dashboardService from '../services/dashboard.service';

export const employeeDashboardController = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getEmployeeDashboard(req.user!, req);
  return ok(res, data, 'OK');
});

export const adminDashboardController = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as { trendDays?: number; activityLimit?: number };
  const data = await dashboardService.getAdminDashboard(req.user!, req, {
    trendDays: query.trendDays,
    activityLimit: query.activityLimit,
  });
  return ok(res, data, 'OK');
});

export const hrDashboardController = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as { expiringWithinDays?: number };
  const data = await dashboardService.getHrDashboard(req.user!, req, {
    expiringWithinDays: query.expiringWithinDays,
  });
  return ok(res, data, 'OK');
});
