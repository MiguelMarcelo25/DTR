import prisma from '../config/prisma';
import type { NotificationType } from '@prisma/client';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Create an in-app notification. Best-effort: never breaks the caller. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed:', err);
  }
}

/** Resolve the User id that owns an employee record (for targeted notifications). */
export async function userIdForEmployee(employeeId: string): Promise<string | null> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  });
  return emp?.userId ?? null;
}
