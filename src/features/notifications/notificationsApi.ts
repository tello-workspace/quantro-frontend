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
      // Bu sorgu hic tag SAGLAMADIGI icin setNotificationPref'in
      // invalidatesTags'i onu hicbir zaman geri cekmiyordu: selectInvalidatedBy
      // yalnizca o tipi saglayan sorgulari gecersiz kilar. Sonuc: PATCH 200
      // donse bile profildeki toggle eski konumunda kaliyordu. Ayri bir id ile
      // tag verip mutasyonun bu girdiyi de tazelemesini sagliyoruz.
      providesTags: [{ type: 'Notification', id: 'PREFS' }],
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
      // Yeniden cekim sunucu cevabini bekledigi icin toggle arada donuk
      // kaliyor ve kullanici "calismadi" sanip tekrar tiklayabiliyordu; iyimser
      // guncelleme ile anahtar aninda yeni konumuna geciyor, istek basarisiz
      // olursa geri aliniyor. Backend enabled=true'da satiri SILDIGI icin
      // (notification.service.setNotificationPref) listeden cikariyor,
      // enabled=false'ta ise {enabled:false} satirini ekliyoruz.
      async onQueryStarted({ type, enabled }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotificationPrefs', undefined, (draft) => {
            if (!draft) return;
            const mevcut = draft.find((p) => p.type === type);
            if (enabled) {
              const index = draft.findIndex((p) => p.type === type);
              if (index !== -1) draft.splice(index, 1);
            } else if (mevcut) {
              mevcut.enabled = false;
            } else {
              draft.push({ type, enabled: false });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
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
