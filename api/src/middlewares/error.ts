import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { isProd } from '../config/env';

/** 404 for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Central error handler — converts any thrown error into the standard error
 * envelope. Maps known Prisma + Zod + JWT errors to friendly HTTP statuses;
 * unknown errors become a 500 and are logged with stack (hidden from clients
 * in production).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Zod (in case one slips past the validate middleware)
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // JWT
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token' });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: `A record with this ${target ?? 'value'} already exists`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        success: false,
        code: 'FK_CONSTRAINT',
        message: 'Related record constraint failed',
      });
      return;
    }
  }

  // Unknown / unexpected
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: isProd ? 'Something went wrong' : (err as Error)?.message ?? 'Internal error',
    ...(isProd ? {} : { stack: (err as Error)?.stack }),
  });
}
