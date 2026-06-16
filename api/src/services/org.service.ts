import type { Request } from 'express';
import prisma from '../config/prisma';
import { MODULES, type RoleName } from '../config/constants';
import { buildPagination, buildMeta } from '../utils/pagination';
import { conflict, notFound } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { audit } from '../utils/audit';

// ─────────────────────────────────────────────────────────────
// Departments
// ─────────────────────────────────────────────────────────────

export async function listDepartments(search?: string) {
  return prisma.department.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { employees: true, positions: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createDepartment(req: Request, data: { name: string; code?: string; description?: string }) {
  const dept = await prisma.department.create({ data });
  await audit(req, { action: 'DEPARTMENT_CREATED', module: MODULES.SETTINGS, description: `Created department ${dept.name}`, newValues: data });
  return dept;
}

export async function updateDepartment(req: Request, id: string, data: { name?: string; code?: string; description?: string }) {
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw notFound('Department not found');
  const dept = await prisma.department.update({ where: { id }, data });
  await audit(req, { action: 'DEPARTMENT_UPDATED', module: MODULES.SETTINGS, description: `Updated department ${dept.name}`, oldValues: existing, newValues: data });
  return dept;
}

export async function deleteDepartment(req: Request, id: string) {
  await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, { action: 'DEPARTMENT_DELETED', module: MODULES.SETTINGS, description: `Archived department ${id}` });
}

// ─────────────────────────────────────────────────────────────
// Positions
// ─────────────────────────────────────────────────────────────

export async function listPositions(search?: string) {
  return prisma.position.findMany({
    where: {
      deletedAt: null,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { department: { select: { id: true, name: true } }, _count: { select: { employees: true } } },
    orderBy: { title: 'asc' },
  });
}

export async function createPosition(req: Request, data: { title: string; level?: string; departmentId?: string | null }) {
  const pos = await prisma.position.create({ data });
  await audit(req, { action: 'POSITION_CREATED', module: MODULES.SETTINGS, description: `Created position ${pos.title}`, newValues: data });
  return pos;
}

export async function updatePosition(req: Request, id: string, data: { title?: string; level?: string; departmentId?: string | null }) {
  const existing = await prisma.position.findUnique({ where: { id } });
  if (!existing) throw notFound('Position not found');
  const pos = await prisma.position.update({ where: { id }, data });
  await audit(req, { action: 'POSITION_UPDATED', module: MODULES.SETTINGS, description: `Updated position ${pos.title}`, oldValues: existing, newValues: data });
  return pos;
}

export async function deletePosition(req: Request, id: string) {
  await prisma.position.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, { action: 'POSITION_DELETED', module: MODULES.SETTINGS, description: `Archived position ${id}` });
}

// ─────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────

export async function listBranches(search?: string) {
  return prisma.branch.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createBranch(req: Request, data: { name: string; address?: string }) {
  const branch = await prisma.branch.create({ data });
  await audit(req, { action: 'BRANCH_CREATED', module: MODULES.SETTINGS, description: `Created branch ${branch.name}`, newValues: data });
  return branch;
}

export async function updateBranch(req: Request, id: string, data: { name?: string; address?: string }) {
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) throw notFound('Branch not found');
  const branch = await prisma.branch.update({ where: { id }, data });
  await audit(req, { action: 'BRANCH_UPDATED', module: MODULES.SETTINGS, description: `Updated branch ${branch.name}`, oldValues: existing, newValues: data });
  return branch;
}

export async function deleteBranch(req: Request, id: string) {
  await prisma.branch.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, { action: 'BRANCH_DELETED', module: MODULES.SETTINGS, description: `Archived branch ${id}` });
}

// ─────────────────────────────────────────────────────────────
// Schedules
// ─────────────────────────────────────────────────────────────

export async function listSchedules(search?: string) {
  return prisma.schedule.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
    include: { _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  });
}

interface ScheduleInput {
  name: string;
  timeIn: string;
  timeOut: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  workDays: number[];
}

export async function createSchedule(req: Request, data: ScheduleInput) {
  const sched = await prisma.schedule.create({ data });
  await audit(req, { action: 'SCHEDULE_CREATED', module: MODULES.SETTINGS, description: `Created schedule ${sched.name}`, newValues: data });
  return sched;
}

export async function updateSchedule(req: Request, id: string, data: Partial<ScheduleInput>) {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) throw notFound('Schedule not found');
  const sched = await prisma.schedule.update({ where: { id }, data });
  await audit(req, { action: 'SCHEDULE_UPDATED', module: MODULES.SETTINGS, description: `Updated schedule ${sched.name}`, oldValues: existing, newValues: data });
  return sched;
}

export async function deleteSchedule(req: Request, id: string) {
  await prisma.schedule.delete({ where: { id } });
  await audit(req, { action: 'SCHEDULE_DELETED', module: MODULES.SETTINGS, description: `Deleted schedule ${id}` });
}

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: 'asc' } });
}

// ─────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────

function sanitizeUserRow(u: {
  id: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  userRoles: { role: { name: RoleName } }[];
  employee: { id: string; employeeNo: string; profile: { firstName: string; lastName: string } | null } | null;
}) {
  return {
    id: u.id,
    email: u.email,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    roles: u.userRoles.map((r) => r.role.name),
    employee: u.employee
      ? {
          id: u.employee.id,
          employeeNo: u.employee.employeeNo,
          name: u.employee.profile
            ? `${u.employee.profile.firstName} ${u.employee.profile.lastName}`
            : null,
        }
      : null,
  };
}

export async function listUsers(query: Record<string, unknown>) {
  const params = buildPagination(query);
  const where = params.search
    ? { email: { contains: params.search, mode: 'insensitive' as const } }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.order },
      include: {
        userRoles: { include: { role: true } },
        employee: { select: { id: true, employeeNo: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  return { items: users.map(sanitizeUserRow), meta: buildMeta(total, params) };
}

export async function createUser(
  req: Request,
  data: { email: string; password: string; role: RoleName; employeeId?: string },
) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw conflict('A user with this email already exists');

  const role = await prisma.role.findUnique({ where: { name: data.role } });
  if (!role) throw notFound('Role not found');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      userRoles: { create: [{ roleId: role.id }] },
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    },
    include: {
      userRoles: { include: { role: true } },
      employee: { select: { id: true, employeeNo: true, profile: { select: { firstName: true, lastName: true } } } },
    },
  });

  await audit(req, { action: 'USER_CREATED', module: MODULES.USER, description: `Created user ${data.email} (${data.role})` });
  return sanitizeUserRow(user);
}

/** Employees with no linked login account — candidates to attach to a user. */
export async function listLinkableEmployees() {
  const emps = await prisma.employee.findMany({
    where: { deletedAt: null, userId: null },
    select: { id: true, employeeNo: true, profile: { select: { firstName: true, lastName: true } } },
    orderBy: { employeeNo: 'asc' },
  });
  return emps.map((e) => ({
    id: e.id,
    employeeNo: e.employeeNo,
    name: e.profile ? `${e.profile.firstName} ${e.profile.lastName}` : e.employeeNo,
  }));
}

export async function updateUser(
  req: Request,
  id: string,
  data: { isActive?: boolean; role?: RoleName; employeeId?: string | null },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('User not found');

  // Link / unlink an employee record (1:1). Gives the account a DTR/time clock.
  if (data.employeeId !== undefined) {
    if (data.employeeId === null) {
      await prisma.employee.updateMany({ where: { userId: id }, data: { userId: null } });
      await audit(req, { action: 'USER_UNLINKED', module: MODULES.USER, description: `Unlinked employee from ${user.email}` });
    } else {
      const emp = await prisma.employee.findUnique({
        where: { id: data.employeeId },
        select: { id: true, userId: true, employeeNo: true },
      });
      if (!emp) throw notFound('Employee not found');
      if (emp.userId && emp.userId !== id) {
        throw conflict('That employee is already linked to another account');
      }
      await prisma.$transaction([
        // enforce 1:1 — detach this user from any other employee first
        prisma.employee.updateMany({ where: { userId: id, NOT: { id: data.employeeId } }, data: { userId: null } }),
        prisma.employee.update({ where: { id: data.employeeId }, data: { userId: id } }),
      ]);
      await audit(req, { action: 'USER_LINKED', module: MODULES.USER, description: `Linked ${user.email} to employee ${emp.employeeNo}` });
    }
  }

  if (typeof data.isActive === 'boolean') {
    await prisma.user.update({ where: { id }, data: { isActive: data.isActive } });
    await audit(req, {
      action: data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: MODULES.USER,
      description: `${data.isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
    });
  }

  if (data.role) {
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw notFound('Role not found');
    // Replace roles with the single selected role
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.create({ data: { userId: id, roleId: role.id } }),
    ]);
    await audit(req, { action: 'USER_ROLE_CHANGED', module: MODULES.USER, description: `Changed role of ${user.email} to ${data.role}` });
  }

  const updated = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: { include: { role: true } },
      employee: { select: { id: true, employeeNo: true, profile: { select: { firstName: true, lastName: true } } } },
    },
  });
  return sanitizeUserRow(updated!);
}
