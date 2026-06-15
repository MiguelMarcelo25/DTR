export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'EMPLOYEE' | 'CLIENT';

export interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
  roles: RoleName[];
  employeeId: string | null;
}

/** Standard API envelopes (mirror the Express response helpers). */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiErrorBody {
  success: false;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
