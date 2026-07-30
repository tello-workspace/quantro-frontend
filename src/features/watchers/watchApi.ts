import { api } from '@/lib/api';

export interface WatchStatus {
  isWatching: boolean;
  watcherCount: number;
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
      invalidatesTags: (_result, _error, cardId) => [{ type: 'Card', id: `watch-${cardId}` }],
    }),
    unwatchCard: builder.mutation<WatchStatus, string>({
      query: (cardId) => ({ url: `/cards/${cardId}/watch`, method: 'DELETE' }),
      transformResponse: (response: ApiEnvelope<WatchStatus>) => response.data,
      invalidatesTags: (_result, _error, cardId) => [{ type: 'Card', id: `watch-${cardId}` }],
    }),
  }),
});

export const { useGetWatchStatusQuery, useWatchCardMutation, useUnwatchCardMutation } = watchApi;
