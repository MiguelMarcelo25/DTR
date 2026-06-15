import type { NextFunction, Request, Response } from 'express';
import type { RoleName } from '../config/constants';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * Route guard: allow only users holding at least one of the given roles.
 * Must run after `authenticate`. Record-level scope (e.g. "own data only") is
 * enforced separately in services via `ensureSelfOrPrivileged`.
 */
export function authorize(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (roles.length === 0) return next();
    const allowed = req.user.roles.some((r) => roles.includes(r));
    if (!allowed) return next(forbidden('You do not have permission to perform this action'));
    return next();
  };
}
