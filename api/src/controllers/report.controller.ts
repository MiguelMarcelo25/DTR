import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { buildPagination, buildMeta } from '../utils/pagination';
import { auditContext } from '../utils/audit';
import * as reportService from '../services/report.service';
import type { ReportFilters } from '../services/report.service';
import type { ReportType } from '../validations/report.validation';

/** Pull the shared report filters off the (already-validated) query. */
function readFilters(req: Request): ReportFilters {
  const q = req.query as Record<string, unknown>;
  return {
    from: q.from as Date | undefined,
    to: q.to as Date | undefined,
    departmentId: typeof q.departmentId === 'string' ? q.departmentId : undefined,
    employeeId: typeof q.employeeId === 'string' ? q.employeeId : undefined,
  };
}

/** Build a controller for a single JSON report type. */
function makeReportController(type: ReportType) {
  return asyncHandler(async (req: Request, res: Response) => {
    const params = buildPagination(req.query);
    const result = await reportService.getReport({
      user: req.user!,
      type,
      filters: readFilters(req),
      params,
      buildMeta,
      audit: { ...auditContext(req), userId: req.user!.id },
    });
    return ok(
      res,
      { columns: result.columns, rows: result.rows, summary: result.summary, meta: result.meta },
      'OK',
    );
  });
}

export const attendanceReportController = makeReportController('attendance');
export const dtrReportController = makeReportController('dtr');
export const lateReportController = makeReportController('late');
export const undertimeReportController = makeReportController('undertime');
export const absencesReportController = makeReportController('absences');
export const leaveReportController = makeReportController('leave');
export const appointmentsReportController = makeReportController('appointments');
export const payrollReportController = makeReportController('payroll');
export const employeesReportController = makeReportController('employees');
export const employeeBackgroundReportController = makeReportController('employee-background');

export const exportReportController = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const type = q.type as ReportType;
  const format = (q.format as 'csv' | 'pdf') ?? 'csv';
  const params = buildPagination(req.query);

  const file = await reportService.exportReport({
    user: req.user!,
    type,
    format,
    filters: readFilters(req),
    params,
    audit: { ...auditContext(req), userId: req.user!.id },
  });

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Content-Length', String(file.buffer.length));
  return res.status(200).send(file.buffer);
});
