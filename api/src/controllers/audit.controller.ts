import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/response';
import { buildPagination } from '../utils/pagination';
import * as auditService from '../services/audit.service';

export const listAuditLogsController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await auditService.listAuditLogs(params, {
    module: req.query.module as string | undefined,
    action: req.query.action as string | undefined,
    userId: req.query.userId as string | undefined,
    employeeId: req.query.employeeId as string | undefined,
    from: req.query.from as unknown as Date | undefined,
    to: req.query.to as unknown as Date | undefined,
  });
  return paginated(res, items, meta, 'Audit logs retrieved');
});

export const getAuditLogController = asyncHandler(async (req: Request, res: Response) => {
  const log = await auditService.getAuditLogById(req.params.id);
  return ok(res, log, 'Audit log retrieved');
});
