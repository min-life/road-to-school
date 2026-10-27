import { mobileApiClient } from './api-client';
export interface NotificationItem { id: string; type: string; title: string; body: string; createdAt: string; readAt: string | null; available: boolean }
export interface NotificationList { items: NotificationItem[]; nextCursor: string | null; hasMore: boolean }
export interface NotificationSummary { unreadCount: number; actionableIncidentCount: number }
export const notificationApi = {
  summary: () => mobileApiClient.request<NotificationSummary>('/notifications/summary'),
  list: (filter: string, cursor?: string) => mobileApiClient.request<NotificationList>(`/notifications?${new URLSearchParams({ filter, limit: '20', ...(cursor ? { cursor } : {}) })}`),
  target: (id: string) => mobileApiClient.request<{ available: boolean; mobilePath: string | null }>(`/notifications/${encodeURIComponent(id)}/target`),
  read: (id?: string) => mobileApiClient.request(`/notifications/${id ? `${encodeURIComponent(id)}/read` : 'read-all'}`, { method: 'PUT' }),
  register: (token: string, expectedUserId: string) => mobileApiClient.request('/notifications/device', { method: 'PUT', body: JSON.stringify({ token, expectedUserId }) }),
  unregister: () => mobileApiClient.request('/notifications/device', { method: 'DELETE' }),
};
