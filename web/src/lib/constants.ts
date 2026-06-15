import type { RoleName } from '@/types';

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
};

export const PRIVILEGED: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'HR'];
export const ADMINS: RoleName[] = ['SUPER_ADMIN', 'ADMIN'];
/** Internal staff (everyone except external clients). */
export const STAFF: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'];

export function hasAnyRole(userRoles: RoleName[], allowed: RoleName[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

export function isPrivileged(userRoles: RoleName[]): boolean {
  return hasAnyRole(userRoles, PRIVILEGED);
}

export function isClient(userRoles: RoleName[]): boolean {
  return userRoles.includes('CLIENT') && !hasAnyRole(userRoles, STAFF);
}

/** Where a user should land after auth, based on role. */
export function homePathForRoles(userRoles: RoleName[]): string {
  return isClient(userRoles) ? '/portal' : '/dashboard';
}
