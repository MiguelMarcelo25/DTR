import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, paginated } from '../utils/response';
import * as attendanceService from '../services/attendance.service';

// ── Punches (self) ──

export const timeInController = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.timeIn(req, req.user!);
  return created(res, record, 'Timed in');
});

export const timeOutController = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.timeOut(req, req.user!);
  return ok(res, record, 'Timed out');
});

export const breakInController = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.breakIn(req, req.user!);
  return ok(res, record, 'Break started');
});

export const breakOutController = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.breakOut(req, req.user!);
  return ok(res, record, 'Break ended');
});

// ── Lists & reads ──

export const listLogsController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, status, from, to } = req.query as {
    employeeId?: string;
    status?: import('@prisma/client').AttendanceStatus;
    from?: Date;
    to?: Date;
  };
  const { items, meta } = await attendanceService.listLogs(req.query, { employeeId, status, from, to });
  return paginated(res, items, meta, 'Attendance logs');
});

export const historyController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, from, to } = req.query as { employeeId?: string; from?: Date; to?: Date };
  const { items, meta } = await attendanceService.history(req.user!, req.query, { employeeId, from, to });
  return paginated(res, items, meta, 'Attendance history');
});

export const monthlyDtrController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, year, month } = req.query as unknown as {
    employeeId?: string;
    year: number;
    month: number;
  };
  const result = await attendanceService.monthlyDtr(req.user!, { employeeId, year, month });
  return ok(res, result, 'Monthly DTR');
});

export const summaryController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, year, month, from, to } = req.query as unknown as {
    employeeId?: string;
    year?: number;
    month?: number;
    from?: Date;
    to?: Date;
  };
  const result = await attendanceService.summary(req.user!, { employeeId, year, month, from, to });
  return ok(res, result, 'Attendance summary');
});

// ── Corrections ──

export const createCorrectionController = asyncHandler(async (req: Request, res: Response) => {
  const correction = await attendanceService.createCorrection(req, req.user!, req.body);
  return created(res, correction, 'Correction request submitted');
});

export const listCorrectionsController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, status } = req.query as {
    employeeId?: string;
    status?: import('@prisma/client').RequestStatus;
  };
  const { items, meta } = await attendanceService.listCorrections(req.user!, req.query, { employeeId, status });
  return paginated(res, items, meta, 'Attendance corrections');
});

export const approveCorrectionController = asyncHandler(async (req: Request, res: Response) => {
  const result = await attendanceService.approveCorrection(req, req.user!, req.params.id, req.body.reviewNote);
  return ok(res, result, 'Correction approved');
});

export const rejectCorrectionController = asyncHandler(async (req: Request, res: Response) => {
  const correction = await attendanceService.rejectCorrection(req, req.user!, req.params.id, req.body.reviewNote);
  return ok(res, correction, 'Correction rejected');
});

// ── Reports ──

export const reportController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, departmentId, from, to, year, month } = req.query as unknown as {
    employeeId?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    year?: number;
    month?: number;
  };
  const rows = await attendanceService.report(req, { employeeId, departmentId, from, to, year, month });
  return ok(res, rows, 'Attendance report');
});

export const reportExportController = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, departmentId, from, to, year, month } = req.query as unknown as {
    employeeId?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    year?: number;
    month?: number;
  };
  const csv = await attendanceService.reportCsv(req, { employeeId, departmentId, from, to, year, month });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
  return res.status(200).send(csv);
});
