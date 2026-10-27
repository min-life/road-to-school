import { apiClient } from './api-client';
export interface NotificationItem { id: string; type: string; title: string; body: string; createdAt: string; readAt: string | null; available: boolean }
export interface NotificationList { items: NotificationItem[]; nextCursor: string | null; hasMore: boolean }
export interface NotificationSummary { unreadCount: number; actionableIncidentCount: number }
export interface NotificationTarget { available: boolean; webPath: string | null; mobilePath: string | null }
export function getNotifications(filter = 'ALL', cursor?: string): Promise<NotificationList> {
  const params = new URLSearchParams({ filter, limit: '20' }); if (cursor) params.set('cursor', cursor);
  return apiClient.request(`/notifications?${params}`);
}
export const getNotificationSummary = () => apiClient.request<NotificationSummary>('/notifications/summary');
export const getNotificationTarget = (id: string) => apiClient.request<NotificationTarget>(`/notifications/${encodeURIComponent(id)}/target`);
export const readNotification = (id?: string) => apiClient.request(`/notifications/${id ? `${encodeURIComponent(id)}/read` : 'read-all'}`, { method: 'PUT' });
