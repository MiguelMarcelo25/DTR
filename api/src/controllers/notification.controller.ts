import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/response';
import * as notificationService from '../services/notification.service';

export const listNotificationsController = asyncHandler(async (req: Request, res: Response) => {
  const { isRead } = req.query as { isRead?: boolean };
  const { items, meta, unreadCount } = await notificationService.listNotifications(
    req.user!,
    req.query,
    { isRead },
  );
  return paginated(res, items, { ...meta, unreadCount } as typeof meta & { unreadCount: number });
});

export const markNotificationReadController = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.user!, req.params.id);
  return ok(res, notification, 'Notification marked as read');
});

export const markAllNotificationsReadController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await notificationService.markAllAsRead(req.user!);
    return ok(res, result, 'All notifications marked as read');
  },
);

export const deleteNotificationController = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.deleteNotification(req.user!, req.params.id);
  return ok(res, null, 'Notification deleted');
});
