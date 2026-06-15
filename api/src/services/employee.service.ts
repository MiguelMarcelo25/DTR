import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import type { AuthUser, PaginationParams } from '../types';
import { isPrivileged, ensureSelfOrPrivileged } from '../utils/access';
import { audit } from '../utils/audit';
import { hashPassword } from '../utils/password';
import { badRequest, conflict, notFound } from '../utils/errors';
import { buildOrderBy, buildMeta } from '../utils/pagination';
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from '../validations/employee.validation';

/** Sortable columns for the employee list (allow-list to avoid arbitrary sort). */
const SORTABLE = ['employeeNo', 'dateHired', 'employmentStatus', 'employmentType', 'createdAt'];

/** Sensitive profile fields visible only to privileged users. */
const SENSITIVE_PROFILE_FIELDS = [
  'tin',
  'sss',
  'philhealth',
  'pagibig',
  'bankName',
  'bankAccountNumber',
  'basicSalary',
  'allowances',
  'salaryType',
  'taxStatus',
] as const;

type ProfileLike = Record<string, unknown> | null | undefined;

/** Remove sensitive government/payroll fields from a profile object. */
function redactProfile<T extends ProfileLike>(profile: T): T {
  if (!profile) return profile;
  const clone: Record<string, unknown> = { ...profile };
  for (const field of SENSITIVE_PROFILE_FIELDS) {
    delete clone[field];
  }
  return clone as T;
}

interface ListFilters {
  departmentId?: string;
  positionId?: string;
  branchId?: string;
  employmentStatus?: ListEmployeesQuery['employmentStatus'];
  employmentType?: ListEmployeesQuery['employmentType'];
}

/** Build the prisma `where` for the list endpoint from search + filters. */
function buildWhere(params: PaginationParams, filters: ListFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = { deletedAt: null };

  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.positionId) where.positionId = filters.positionId;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.employmentStatus) where.employmentStatus = filters.employmentStatus;
  if (filters.employmentType) where.employmentType = filters.employmentType;

  if (params.search) {
    const term = params.search;
    where.OR = [
      { employeeNo: { contains: term, mode: 'insensitive' } },
      { profile: { firstName: { contains: term, mode: 'insensitive' } } },
      { profile: { lastName: { contains: term, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/** Paginated list of non-deleted employees with light relations. */
export async function listEmployees(params: PaginationParams, filters: ListFilters) {
  const where = buildWhere(params, filters);
  const orderBy = buildOrderBy(params, SORTABLE, 'createdAt');

  const [total, items] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy,
      include: {
        profile: { select: { firstName: true, lastName: true, photoUrl: true } },
        department: { select: { name: true } },
        position: { select: { title: true } },
      },
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

/** Generate the next sequential employee number (EMP-0001 style). */
async function generateEmployeeNo(): Promise<string> {
  const count = await prisma.employee.count();
  const next = count + 1;
  return `EMP-${String(next).padStart(4, '0')}`;
}

/** Create an employee + profile, optionally a linked user account. */
export async function createEmployee(req: Request, input: CreateEmployeeInput) {
  const employeeNo = input.employeeNo ?? (await generateEmployeeNo());

  const existing = await prisma.employee.findUnique({ where: { employeeNo } });
  if (existing) throw conflict('An employee with that employee number already exists');

  let userConnect: { connect: { id: string } } | undefined;

  if (input.account) {
    const dupUser = await prisma.user.findUnique({ where: { email: input.account.email } });
    if (dupUser) throw conflict('A user account with that email already exists');

    const roleName = input.account.role ?? 'EMPLOYEE';
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw badRequest(`Role ${roleName} does not exist`, 'INVALID_ROLE');

    const passwordHash = await hashPassword(input.account.password);
    const user = await prisma.user.create({
      data: {
        email: input.account.email,
        passwordHash,
        userRoles: { create: { roleId: role.id } },
      },
    });
    userConnect = { connect: { id: user.id } };
  }

  const employee = await prisma.employee.create({
    data: {
      employeeNo,
      employmentType: input.employmentType,
      employmentStatus: input.employmentStatus,
      rank: input.rank,
      dateHired: input.dateHired,
      regularizationDate: input.regularizationDate,
      ...(input.departmentId ? { department: { connect: { id: input.departmentId } } } : {}),
      ...(input.positionId ? { position: { connect: { id: input.positionId } } } : {}),
      ...(input.branchId ? { branch: { connect: { id: input.branchId } } } : {}),
      ...(input.scheduleId ? { schedule: { connect: { id: input.scheduleId } } } : {}),
      ...(input.supervisorId ? { supervisor: { connect: { id: input.supervisorId } } } : {}),
      ...(userConnect ? { user: userConnect } : {}),
      profile: {
        create: {
          firstName: input.profile.firstName,
          middleName: input.profile.middleName,
          lastName: input.profile.lastName,
          suffix: input.profile.suffix,
          dateOfBirth: input.profile.dateOfBirth,
          gender: input.profile.gender,
          civilStatus: input.profile.civilStatus,
          nationality: input.profile.nationality,
          contactNumber: input.profile.contactNumber,
          email: input.profile.email,
          currentAddress: input.profile.currentAddress,
          permanentAddress: input.profile.permanentAddress,
          photoUrl: input.profile.photoUrl,
        },
      },
      timeline: {
        create: {
          eventType: 'HIRED',
          description: `Employee ${employeeNo} hired`,
          createdById: req.user?.id ?? null,
        },
      },
    },
    include: {
      profile: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
    },
  });

  await audit(req, {
    action: 'EMPLOYEE_CREATED',
    module: MODULES.EMPLOYEE,
    description: `Created employee ${employeeNo}`,
    employeeId: employee.id,
    newValues: { employeeNo, employmentType: employee.employmentType },
  });

  return employee;
}

/** Full employee detail with relations. Redacts sensitive fields for non-privileged. */
export async function getEmployeeById(req: Request, user: AuthUser, id: string) {
  ensureSelfOrPrivileged(user, id);

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: {
      profile: true,
      department: true,
      position: true,
      branch: true,
      schedule: true,
      supervisor: {
        select: {
          id: true,
          employeeNo: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!employee) throw notFound('Employee not found');

  const privileged = isPrivileged(user);

  // Audit privileged access to government/payroll-sensitive data.
  if (privileged) {
    await audit(req, {
      action: 'EMPLOYEE_SENSITIVE_VIEWED',
      module: MODULES.EMPLOYEE,
      description: `Viewed employee ${employee.employeeNo} (incl. sensitive fields)`,
      employeeId: employee.id,
    });
  }

  if (!privileged) {
    return { ...employee, profile: redactProfile(employee.profile) };
  }

  return employee;
}

/** Update core employment fields; record timeline events for material changes. */
export async function updateEmployee(req: Request, id: string, input: UpdateEmployeeInput) {
  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw notFound('Employee not found');

  const data: Prisma.EmployeeUpdateInput = {};
  if (input.employmentType !== undefined) data.employmentType = input.employmentType;
  if (input.employmentStatus !== undefined) data.employmentStatus = input.employmentStatus;
  if (input.rank !== undefined) data.rank = input.rank;
  if (input.dateHired !== undefined) data.dateHired = input.dateHired;
  if (input.regularizationDate !== undefined) data.regularizationDate = input.regularizationDate;

  if (input.departmentId !== undefined) {
    data.department = input.departmentId
      ? { connect: { id: input.departmentId } }
      : { disconnect: true };
  }
  if (input.positionId !== undefined) {
    data.position = input.positionId
      ? { connect: { id: input.positionId } }
      : { disconnect: true };
  }
  if (input.branchId !== undefined) {
    data.branch = input.branchId ? { connect: { id: input.branchId } } : { disconnect: true };
  }
  if (input.scheduleId !== undefined) {
    data.schedule = input.scheduleId ? { connect: { id: input.scheduleId } } : { disconnect: true };
  }
  if (input.supervisorId !== undefined) {
    data.supervisor = input.supervisorId
      ? { connect: { id: input.supervisorId } }
      : { disconnect: true };
  }

  const updated = await prisma.employee.update({ where: { id }, data });

  // Timeline events for material changes.
  const timelineEvents: Prisma.EmployeeActivityTimelineCreateManyInput[] = [];
  if (input.departmentId !== undefined && input.departmentId !== current.departmentId) {
    timelineEvents.push({
      employeeId: id,
      eventType: 'DEPARTMENT_CHANGED',
      description: 'Department changed',
      createdById: req.user?.id ?? null,
    });
  }
  if (input.positionId !== undefined && input.positionId !== current.positionId) {
    timelineEvents.push({
      employeeId: id,
      eventType: 'POSITION_CHANGED',
      description: 'Position changed',
      createdById: req.user?.id ?? null,
    });
  }
  if (
    input.employmentStatus !== undefined &&
    input.employmentStatus !== current.employmentStatus
  ) {
    timelineEvents.push({
      employeeId: id,
      eventType: 'EMPLOYMENT_STATUS_CHANGED',
      description: `Employment status changed from ${current.employmentStatus} to ${input.employmentStatus}`,
      createdById: req.user?.id ?? null,
    });
  }
  if (timelineEvents.length > 0) {
    await prisma.employeeActivityTimeline.createMany({ data: timelineEvents });
  }

  await audit(req, {
    action: 'EMPLOYEE_UPDATED',
    module: MODULES.EMPLOYEE,
    description: `Updated employee ${current.employeeNo}`,
    employeeId: id,
    oldValues: {
      departmentId: current.departmentId,
      positionId: current.positionId,
      branchId: current.branchId,
      scheduleId: current.scheduleId,
      supervisorId: current.supervisorId,
      employmentType: current.employmentType,
      employmentStatus: current.employmentStatus,
      rank: current.rank,
    },
    newValues: {
      departmentId: updated.departmentId,
      positionId: updated.positionId,
      branchId: updated.branchId,
      scheduleId: updated.scheduleId,
      supervisorId: updated.supervisorId,
      employmentType: updated.employmentType,
      employmentStatus: updated.employmentStatus,
      rank: updated.rank,
    },
  });

  return updated;
}

/** Soft delete an employee (set deletedAt). */
export async function softDeleteEmployee(req: Request, id: string) {
  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw notFound('Employee not found');

  await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });

  await audit(req, {
    action: 'EMPLOYEE_DELETED',
    module: MODULES.EMPLOYEE,
    description: `Soft-deleted employee ${current.employeeNo}`,
    employeeId: id,
  });
}

/** Deactivate an employee: status INACTIVE and disable any linked user. */
export async function deactivateEmployee(req: Request, id: string) {
  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw notFound('Employee not found');

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: { employmentStatus: 'INACTIVE' },
    });
    if (current.userId) {
      await tx.user.update({ where: { id: current.userId }, data: { isActive: false } });
    }
    await tx.employeeActivityTimeline.create({
      data: {
        employeeId: id,
        eventType: 'EMPLOYMENT_STATUS_CHANGED',
        description: `Employment status changed from ${current.employmentStatus} to INACTIVE`,
        createdById: req.user?.id ?? null,
      },
    });
  });

  await audit(req, {
    action: 'EMPLOYEE_DEACTIVATED',
    module: MODULES.EMPLOYEE,
    description: `Deactivated employee ${current.employeeNo}`,
    employeeId: id,
    oldValues: { employmentStatus: current.employmentStatus },
    newValues: { employmentStatus: 'INACTIVE' },
  });

  return prisma.employee.findUnique({ where: { id } });
}

/** Archive an employee (set archivedAt = now). */
export async function archiveEmployee(req: Request, id: string) {
  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw notFound('Employee not found');

  const updated = await prisma.employee.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await audit(req, {
    action: 'EMPLOYEE_ARCHIVED',
    module: MODULES.EMPLOYEE,
    description: `Archived employee ${current.employeeNo}`,
    employeeId: id,
  });

  return updated;
}

/** Escape a value for CSV (RFC 4180 style quoting). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV masterlist of all non-deleted employees. */
export async function buildMasterlistCsv(req: Request): Promise<string> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { employeeNo: 'asc' },
    include: {
      profile: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
      position: { select: { title: true } },
    },
  });

  const header = [
    'employeeNo',
    'name',
    'department',
    'position',
    'type',
    'status',
    'dateHired',
  ];

  const rows = employees.map((emp) => {
    const name = emp.profile
      ? `${emp.profile.firstName} ${emp.profile.lastName}`.trim()
      : '';
    return [
      csvCell(emp.employeeNo),
      csvCell(name),
      csvCell(emp.department?.name),
      csvCell(emp.position?.title),
      csvCell(emp.employmentType),
      csvCell(emp.employmentStatus),
      csvCell(emp.dateHired.toISOString().slice(0, 10)),
    ].join(',');
  });

  await audit(req, {
    action: 'EMPLOYEE_MASTERLIST_EXPORTED',
    module: MODULES.EMPLOYEE,
    description: `Exported employee masterlist (${employees.length} records)`,
  });

  return [header.join(','), ...rows].join('\r\n');
}
