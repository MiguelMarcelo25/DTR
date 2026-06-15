import { api } from '@/lib/api';
import type { ApiResponse, Paginated } from '@/types';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(): Promise<Paginated<Notification>> {
  const res = await api.get<ApiResponse<Notification[]>>('/notifications', {
    params: { limit: 10, page: 1 },
  });
  return {
    items: res.data.data,
    meta: res.data.meta ?? {
      page: 1,
      limit: 10,
      total: res.data.data.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}
