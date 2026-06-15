import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { notFound } from '../utils/errors';
import { buildMeta, buildOrderBy } from '../utils/pagination';
import type { PaginationMeta, PaginationParams } from '../types';
import { AUDIT_SORT_FIELDS } from '../validations/audit.validation';

export interface AuditLogFilters {
  module?: string;
  action?: string;
  userId?: string;
  employeeId?: string;
  from?: Date;
  to?: Date;
}

/** Always surface who performed the action (email only — no sensitive user fields). */
const auditInclude = {
  user: { select: { id: true, email: true } },
} satisfies Prisma.AuditLogInclude;

/** Build a Prisma `where` from search text + filters. */
function buildWhere(params: PaginationParams, filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.module) where.module = filters.module;
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  if (filters.employeeId) where.employeeId = filters.employeeId;

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  if (params.search) {
    where.description = { contains: params.search, mode: 'insensitive' };
  }

  return where;
}

/** Paginated list of audit logs, newest first by default. */
export async function listAuditLogs(
  params: PaginationParams,
  filters: AuditLogFilters,
): Promise<{ items: Awaited<ReturnType<typeof fetchPage>>; meta: PaginationMeta }> {
  const where = buildWhere(params, filters);
  const orderBy = buildOrderBy(params, [...AUDIT_SORT_FIELDS], 'createdAt');

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    fetchPage(where, orderBy, params),
  ]);

  return { items, meta: buildMeta(total, params) };
}

function fetchPage(
  where: Prisma.AuditLogWhereInput,
  orderBy: Record<string, 'asc' | 'desc'>,
  params: PaginationParams,
) {
  return prisma.auditLog.findMany({
    where,
    include: auditInclude,
    orderBy,
    skip: params.skip,
    take: params.take,
  });
}

/** Single audit log detail. */
export async function getAuditLogById(id: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: auditInclude,
  });
  if (!log) throw notFound('Audit log not found');
  return log;
}
