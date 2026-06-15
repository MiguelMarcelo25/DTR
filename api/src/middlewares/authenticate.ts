import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorized } from '../utils/errors';

/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Distinguishes an EXPIRED token (code `TOKEN_EXPIRED`, the client should call
 * /auth/refresh-token) from an otherwise invalid/missing token.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Authentication required', 'NO_TOKEN'));
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      employeeId: payload.employeeId,
    };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(unauthorized('Access token expired', 'TOKEN_EXPIRED'));
    }
    return next(unauthorized('Invalid access token', 'INVALID_TOKEN'));
  }
}
