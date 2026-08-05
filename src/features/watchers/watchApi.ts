import { api } from '@/lib/api';
import type { Priority } from '@/features/board/services/boardService';

export interface WatchStatus {
  isWatching: boolean;
  watcherCount: number;
}

/**
 * Izlenen kart. Atanan kart listesiyle (AssignedCard) BENZER ama ayni degil:
 * burada "kim yapiyor" bilgisi (assignees) var, cunku izledigin bir isin
 * sahibi sen degilsin - asil merak edilen sey o.
 */
export interface WatchedCard {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  lastActivityAt: string;
  watchedAt: string;
  columnId: string;
  columnName: string;
  isDone: boolean;
  projectId: string;
  projectName: string;
  organizationId: string;
  assignees: { id: string; name: string; avatarUrl: string | null }[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const watchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWatchStatus: builder.query<WatchStatus, string>({
      query: (cardId) => `/cards/${cardId}/watch`,
      transformResponse: (response: ApiEnvelope<WatchStatus>) => response.data,
      providesTags: (_result, _error, cardId) => [{ type: 'Card', id: `watch-${cardId}` }],
    }),
    watchCard: builder.mutation<WatchStatus, string>({
      query: (cardId) => ({ url: `/cards/${cardId}/watch`, method: 'POST' }),
      transformResponse: (response: ApiEnvelope<WatchStatus>) => response.data,
      // WatchedCards da gecersiz kilinmali: kullanici karti izlemeye alir
      // almaz dashboard'daki "Izlediklerim" listesinde gorunmeli. Ozelligin
      // ilk surumu tam da bu geri bildirim eksik oldugu icin kullanissiz
      // bulunmustu - abone oluyordun ama sonucunu hicbir yerde gormuyordun.
      invalidatesTags: (_result, _error, cardId) => [
        { type: 'Card', id: `watch-${cardId}` },
        'WatchedCards',
      ],
    }),
    unwatchCard: builder.mutation<WatchStatus, string>({
      query: (cardId) => ({ url: `/cards/${cardId}/watch`, method: 'DELETE' }),
      transformResponse: (response: ApiEnvelope<WatchStatus>) => response.data,
      invalidatesTags: (_result, _error, cardId) => [
        { type: 'Card', id: `watch-${cardId}` },
        'WatchedCards',
      ],
    }),
    getWatchedCards: builder.query<WatchedCard[], void>({
      query: () => '/me/watched-cards',
      transformResponse: (response: ApiEnvelope<WatchedCard[]>) => response.data,
      providesTags: ['WatchedCards'],
    }),
  }),
});

export const {
  useGetWatchStatusQuery,
  useWatchCardMutation,
  useUnwatchCardMutation,
  useGetWatchedCardsQuery,
} = watchApi;
