import { api } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  cardId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  card: { id: string; title: string } | null;
  invitation: { id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      transformResponse: (response: ApiEnvelope<Notification[]>) => response.data,
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<number, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (response: ApiEnvelope<{ count: number }>) => response.data.count,
      providesTags: ['Notification'],
    }),
    markAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    getNotificationPrefs: builder.query<{ type: string; enabled: boolean }[], void>({
      query: () => '/me/notification-preferences',
      transformResponse: (response: ApiEnvelope<{ type: string; enabled: boolean }[]>) => response.data,
    }),
    setNotificationPref: builder.mutation<{ type: string; enabled: boolean }, { type: string; enabled: boolean }>({
      query: (body) => ({
        url: '/me/notification-preferences',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<{ type: string; enabled: boolean }>) => response.data,
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useGetNotificationPrefsQuery,
  useSetNotificationPrefMutation,
} = notificationsApi;
