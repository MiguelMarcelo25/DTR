import type { RoleName } from '../config/constants';

/** The authenticated principal attached to each request by `authenticate`. */
export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
  employeeId: string | null;
}

/** Standard success envelope returned to clients. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/** Standard error envelope returned to clients. */
export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sort?: string;
  order: 'asc' | 'desc';
  search?: string;
}

export type { RoleName };
