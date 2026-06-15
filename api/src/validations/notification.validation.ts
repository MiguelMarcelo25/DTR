import { z } from 'zod';

/** GET /notifications — list current user's notifications. */
export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
});

/** Params for routes acting on a single notification. */
export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
