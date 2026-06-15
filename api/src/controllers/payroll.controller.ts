import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, paginated } from '../utils/response';
import { buildPagination } from '../utils/pagination';
import * as payrollService from '../services/payroll.service';

// ── Payroll periods ──

export const processPayrollController = asyncHandler(async (req: Request, res: Response) => {
  const { name, startDate, endDate, payDate } = req.body;
  const result = await payrollService.processPayroll(req, req.user!, {
    name,
    startDate,
    endDate,
    payDate,
  });
  return created(res, result, 'Payroll processed');
});

export const listPeriodsController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await payrollService.listPeriods(params, {
    status: req.query.status as never,
  });
  return paginated(res, items, meta, 'Payroll periods');
});

export const getPeriodController = asyncHandler(async (req: Request, res: Response) => {
  const period = await payrollService.getPeriod(req.params.id);
  return ok(res, period, 'Payroll period');
});

export const recalculatePeriodController = asyncHandler(async (req: Request, res: Response) => {
  const result = await payrollService.recalculatePeriod(req, req.user!, req.params.id);
  return ok(res, result, 'Payroll recalculated');
});

export const releasePeriodController = asyncHandler(async (req: Request, res: Response) => {
  const period = await payrollService.releasePeriod(req, req.params.id);
  return ok(res, period, 'Payroll released');
});

export const cancelPeriodController = asyncHandler(async (req: Request, res: Response) => {
  const period = await payrollService.cancelPeriod(req, req.params.id);
  return ok(res, period, 'Payroll cancelled');
});

export const getPeriodPayslipsController = asyncHandler(async (req: Request, res: Response) => {
  const payslips = await payrollService.getPeriodPayslips(req.params.id);
  return ok(res, payslips, 'Period payslips');
});

// ── Reports ──

export const getReportsController = asyncHandler(async (req: Request, res: Response) => {
  const report = await payrollService.getReports({
    status: req.query.status as never,
    periodId: req.query.periodId as string | undefined,
    startDate: req.query.startDate as unknown as Date | undefined,
    endDate: req.query.endDate as unknown as Date | undefined,
  });
  return ok(res, report, 'Payroll report');
});

export const exportReportsController = asyncHandler(async (req: Request, res: Response) => {
  const csv = await payrollService.exportReportsCsv({
    status: req.query.status as never,
    periodId: req.query.periodId as string | undefined,
    startDate: req.query.startDate as unknown as Date | undefined,
    endDate: req.query.endDate as unknown as Date | undefined,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="payroll-report.csv"');
  return res.send(csv);
});

// ── Payslips (self / privileged) ──

export const listPayslipsController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await payrollService.listPayslips(req.user!, params, {
    periodId: req.query.periodId as string | undefined,
  });
  return paginated(res, items, meta, 'Payslips');
});

export const getPayslipController = asyncHandler(async (req: Request, res: Response) => {
  const payslip = await payrollService.getPayslip(req, req.user!, req.params.id);
  return ok(res, payslip, 'Payslip');
});

export const downloadPayslipController = asyncHandler(async (req: Request, res: Response) => {
  const { buffer, filename } = await payrollService.downloadPayslip(req, req.user!, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});
