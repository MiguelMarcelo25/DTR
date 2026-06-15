import type { Response } from 'express';
import type { PaginationMeta } from '../types';

/** Single consistent success shape across the whole API. */
export function ok<T>(res: Response, data: T, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T, message = 'Created') {
  return ok(res, data, message, 201);
}

export function noContent(res: Response) {
  return res.status(204).send();
}

/** Paginated list response with `meta`. */
export function paginated<T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  message = 'OK',
) {
  return res.status(200).json({ success: true, message, data: items, meta });
}
