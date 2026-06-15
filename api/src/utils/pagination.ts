import { PAGINATION } from '../config/constants';
import type { PaginationMeta, PaginationParams } from '../types';

/**
 * Normalise raw query params into safe pagination/sort/search values.
 * Caps `limit` at MAX_LIMIT to protect the DB from unbounded scans.
 */
export function buildPagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || PAGINATION.DEFAULT_PAGE);
  const limitRaw = Number(query.limit) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, limitRaw), PAGINATION.MAX_LIMIT);
  const order = String(query.order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const sort = typeof query.sort === 'string' && query.sort ? query.sort : undefined;
  const search =
    typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

  return { page, limit, skip: (page - 1) * limit, take: limit, sort, order, search };
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/** Build a Prisma `orderBy` from sort/order, falling back to a default field. */
export function buildOrderBy(
  params: PaginationParams,
  allowed: string[],
  fallback = 'createdAt',
): Record<string, 'asc' | 'desc'> {
  const field = params.sort && allowed.includes(params.sort) ? params.sort : fallback;
  return { [field]: params.order };
}
