import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, paginated } from '../utils/response';
import * as leaveService from '../services/leave.service';

// ─────────────────────────────────────────────────────────────
// Leave types
// ─────────────────────────────────────────────────────────────

export const listLeaveTypesController = asyncHandler(async (_req: Request, res: Response) => {
  const types = await leaveService.listLeaveTypes();
  return ok(res, types, 'Leave types retrieved');
});

export const createLeaveTypeController = asyncHandler(async (req: Request, res: Response) => {
  const type = await leaveService.createLeaveType(req, req.body);
  return created(res, type, 'Leave type created');
});

export const updateLeaveTypeController = asyncHandler(async (req: Request, res: Response) => {
  const type = await leaveService.updateLeaveType(req, req.params.id, req.body);
  return ok(res, type, 'Leave type updated');
});

export const deleteLeaveTypeController = asyncHandler(async (req: Request, res: Response) => {
  await leaveService.deleteLeaveType(req, req.params.id);
  return ok(res, null, 'Leave type deleted');
});

// ─────────────────────────────────────────────────────────────
// Leave requests
// ─────────────────────────────────────────────────────────────

export const listLeaveRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await leaveService.listLeaveRequests(req.user!, req.query as never);
  return paginated(res, items, meta, 'Leave requests retrieved');
});

export const createLeaveRequestController = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.createLeaveRequest(req, req.user!, req.body);
  return created(res, request, 'Leave request submitted');
});

export const getLeaveRequestController = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.getLeaveRequest(req.user!, req.params.id);
  return ok(res, request, 'Leave request retrieved');
});

export const cancelLeaveRequestController = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.cancelLeaveRequest(req, req.user!, req.params.id);
  return ok(res, request, 'Leave request cancelled');
});

export const approveLeaveRequestController = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.approveLeaveRequest(
    req,
    req.user!,
    req.params.id,
    req.body?.reviewNote,
  );
  return ok(res, request, 'Leave request approved');
});

export const rejectLeaveRequestController = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.rejectLeaveRequest(
    req,
    req.user!,
    req.params.id,
    req.body.reviewNote,
  );
  return ok(res, request, 'Leave request rejected');
});

// ─────────────────────────────────────────────────────────────
// Leave balances
// ─────────────────────────────────────────────────────────────

export const listLeaveBalancesController = asyncHandler(async (req: Request, res: Response) => {
  const balances = await leaveService.listLeaveBalances(req.user!, {
    employeeId: req.query.employeeId as string | undefined,
    leaveTypeId: req.query.leaveTypeId as string | undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
  });
  return ok(res, balances, 'Leave balances retrieved');
});

export const getEmployeeBalancesController = asyncHandler(async (req: Request, res: Response) => {
  const balances = await leaveService.getEmployeeBalances(
    req.user!,
    req.params.employeeId,
    req.query.year ? Number(req.query.year) : undefined,
  );
  return ok(res, balances, 'Leave balances retrieved');
});

export const adjustLeaveBalanceController = asyncHandler(async (req: Request, res: Response) => {
  const balance = await leaveService.adjustLeaveBalance(req, req.params.employeeId, req.body);
  return ok(res, balance, 'Leave balance adjusted');
});

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

export const leaveReportController = asyncHandler(async (req: Request, res: Response) => {
  const report = await leaveService.leaveReport(req.query as never);
  return ok(res, report, 'Leave report generated');
});

export const leaveReportExportController = asyncHandler(async (req: Request, res: Response) => {
  const csv = await leaveService.leaveReportCsv(req.query as never);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leave-report.csv"');
  return res.status(200).send(csv);
});
