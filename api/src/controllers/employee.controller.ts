import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, paginated, noContent } from '../utils/response';
import { buildPagination } from '../utils/pagination';
import { listEmployeesQuerySchema } from '../validations/employee.validation';
import * as employeeService from '../services/employee.service';

export const listEmployeesController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  // Already validated by middleware; re-parse to obtain typed filter values.
  const query = listEmployeesQuerySchema.parse(req.query);
  const { items, meta } = await employeeService.listEmployees(params, {
    departmentId: query.departmentId,
    positionId: query.positionId,
    branchId: query.branchId,
    employmentStatus: query.employmentStatus,
    employmentType: query.employmentType,
  });
  return paginated(res, items, meta);
});

export const createEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.createEmployee(req, req.body);
  return created(res, employee, 'Employee created');
});

export const getEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.getEmployeeById(req, req.user!, req.params.id);
  return ok(res, employee);
});

export const updateEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.updateEmployee(req, req.params.id, req.body);
  return ok(res, employee, 'Employee updated');
});

export const deleteEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  await employeeService.softDeleteEmployee(req, req.params.id);
  return noContent(res);
});

export const deactivateEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.deactivateEmployee(req, req.params.id);
  return ok(res, employee, 'Employee deactivated');
});

export const archiveEmployeeController = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.archiveEmployee(req, req.params.id);
  return ok(res, employee, 'Employee archived');
});

export const exportMasterlistController = asyncHandler(async (req: Request, res: Response) => {
  const csv = await employeeService.buildMasterlistCsv(req);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="employee-masterlist.csv"');
  return res.status(200).send(csv);
});
