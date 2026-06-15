import type { Notification, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { buildMeta, buildOrderBy, buildPagination } from '../utils/pagination';
import { notFound } from '../utils/errors';
import type { AuthUser, PaginationMeta } from '../types';

/** Columns a client may sort the notification list by. */
const SORTABLE = ['createdAt', 'readAt', 'isRead', 'type', 'title'];

interface ListFilters {
  isRead?: boolean;
}

interface ListResult<T> {
  items: T[];
  meta: PaginationMeta;
  unreadCount: number;
}

/**
 * Paginated list of the current user's OWN notifications. Always scoped to
 * `user.id`. Also returns the user's total unread count so the UI can render a
 * badge without a second request.
 */
export async function listNotifications(
  user: AuthUser,
  query: Record<string, unknown>,
  filters: ListFilters,
): Promise<ListResult<Notification>> {
  const params = buildPagination(query);

  const where: Prisma.NotificationWhereInput = { userId: user.id };
  if (filters.isRead !== undefined) where.isRead = filters.isRead;
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { message: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, items, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: buildOrderBy(params, SORTABLE, 'createdAt'),
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return { items, meta: buildMeta(total, params), unreadCount };
}

/** Load a notification and assert it belongs to the current user. */
async function getOwned(user: AuthUser, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== user.id) {
    throw notFound('Notification not found');
  }
  return notification;
}

/** Mark a single notification (owned by the user) as read. */
export async function markAsRead(user: AuthUser, id: string) {
  const existing = await getOwned(user, id);
  if (existing.isRead) return existing;

  return prisma.notification.update({
    where: { id: existing.id },
    data: { isRead: true, readAt: new Date() },
  });
}

/** Mark all of the current user's unread notifications as read. */
export async function markAllAsRead(user: AuthUser): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

/** Delete a single notification owned by the current user. */
export async function deleteNotification(user: AuthUser, id: string): Promise<void> {
  const existing = await getOwned(user, id);
  await prisma.notification.delete({ where: { id: existing.id } });
}
