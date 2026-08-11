import { api } from '@/lib/api';

export interface TimeLog {
  id: string;
  cardId: string;
  userId: string;
  minutes: number;
  note?: string | null;
  loggedAt: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const timeLogApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTimeLogs: builder.query<TimeLog[], string>({
      query: (cardId) => `/cards/${cardId}/time-logs`,
      transformResponse: (response: ApiEnvelope<TimeLog[]>) => response.data,
      providesTags: (_result, _error, cardId) => [{ type: 'Card', id: `time-logs-${cardId}` }],
    }),
    createTimeLog: builder.mutation<
      TimeLog,
      { cardId: string; minutes: number; note?: string; loggedAt?: string }
    >({
      query: ({ cardId, ...body }) => ({
        url: `/cards/${cardId}/time-logs`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<TimeLog>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [
        { type: 'Card', id: `time-logs-${cardId}` },
        { type: 'Card', id: cardId },
      ],
    }),
    deleteTimeLog: builder.mutation<void, { logId: string; cardId: string }>({
      query: ({ logId }) => ({
        url: `/time-logs/${logId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { cardId }) => [
        { type: 'Card', id: `time-logs-${cardId}` },
        { type: 'Card', id: cardId },
      ],
    }),
  }),
});

export const { useGetTimeLogsQuery, useCreateTimeLogMutation, useDeleteTimeLogMutation } = timeLogApi;
