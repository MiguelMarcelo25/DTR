import { PRIVILEGED_ROLES, type RoleName } from '../config/constants';
import type { AuthUser } from '../types';
import { forbidden } from './errors';

export function hasRole(user: AuthUser, ...roles: RoleName[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

/** Privileged = Super Admin / Admin / HR (can read other employees' data). */
export function isPrivileged(user: AuthUser): boolean {
  return user.roles.some((r) => PRIVILEGED_ROLES.includes(r));
}

/**
 * Record-scope guard used inside services: a non-privileged (Employee) user may
 * only act on their OWN employee record. Throws 403 otherwise. Returns silently
 * for privileged users.
 */
export function ensureSelfOrPrivileged(user: AuthUser, targetEmployeeId: string): void {
  if (isPrivileged(user)) return;
  if (user.employeeId && user.employeeId === targetEmployeeId) return;
  throw forbidden('You can only access your own records');
}
