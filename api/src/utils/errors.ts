/**
 * Application-level error with an HTTP status, a stable machine-readable `code`,
 * and optional `details` (e.g. Zod field errors). The central error handler
 * serializes these into the standard error envelope. `isOperational` marks
 * expected errors (vs. programmer bugs) so we can log differently.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const badRequest = (msg = 'Bad request', code = 'BAD_REQUEST', details?: unknown) =>
  new AppError(msg, 400, code, details);

export const unauthorized = (msg = 'Unauthorized', code = 'UNAUTHORIZED') =>
  new AppError(msg, 401, code);

export const forbidden = (msg = 'Forbidden') => new AppError(msg, 403, 'FORBIDDEN');

export const notFound = (msg = 'Resource not found') => new AppError(msg, 404, 'NOT_FOUND');

export const conflict = (msg = 'Conflict', details?: unknown) =>
  new AppError(msg, 409, 'CONFLICT', details);

export const unprocessable = (msg = 'Unprocessable entity', details?: unknown) =>
  new AppError(msg, 422, 'VALIDATION_ERROR', details);
