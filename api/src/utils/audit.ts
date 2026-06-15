import type { Request } from 'express';
import prisma from '../config/prisma';

export interface AuditEntry {
  userId?: string | null;
  employeeId?: string | null;
  action: string;
  module: string;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}

/** Extract client IP + UA from a request for audit context. */
export function auditContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]) ?? req.socket.remoteAddress ?? null;
  return { ipAddress: ip, userAgent: req.headers['user-agent'] ?? null };
}

/**
 * Best-effort audit writer. Auditing must never break a business operation, so
 * failures are swallowed (logged) rather than propagated.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        employeeId: entry.employeeId ?? null,
        action: entry.action,
        module: entry.module,
        description: entry.description,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        oldValues: entry.oldValues === undefined ? undefined : (entry.oldValues as object),
        newValues: entry.newValues === undefined ? undefined : (entry.newValues as object),
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write audit log:', err);
  }
}

/** Convenience: write an audit entry deriving context straight from the request. */
export async function audit(
  req: Request,
  entry: Omit<AuditEntry, 'ipAddress' | 'userAgent' | 'userId'> & { userId?: string | null },
): Promise<void> {
  const ctx = auditContext(req);
  await writeAudit({
    ...entry,
    userId: entry.userId ?? req.user?.id ?? null,
    ...ctx,
  });
}
