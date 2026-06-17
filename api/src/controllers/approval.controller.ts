import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/response';
import * as approvalService from '../services/approval.service';

export const getApprovalInboxController = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await approvalService.getInbox(req.user!, req.query as never);
  return paginated(res, items, meta, 'Approval inbox retrieved');
});

export const getApprovalController = asyncHandler(async (req: Request, res: Response) => {
  const approval = await approvalService.getApproval(req.params.id, req.user!);
  return ok(res, approval, 'Approval retrieved');
});

export const actOnApprovalController = asyncHandler(async (req: Request, res: Response) => {
  const approval = await approvalService.actOnApproval(req, req.user!, req.params.id, req.body);
  return ok(res, approval, 'Approval updated');
});
