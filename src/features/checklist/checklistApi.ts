import { api } from '@/lib/api';

export interface ChecklistItem {
  id: string;
  cardId: string;
  text: string;
  done: boolean;
  position: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const checklistApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getChecklist: builder.query<ChecklistItem[], string>({
      query: (cardId) => `/cards/${cardId}/checklist`,
      transformResponse: (response: ApiEnvelope<ChecklistItem[]>) => response.data,
      providesTags: (_result, _error, cardId) => [{ type: 'Card', id: `checklist-${cardId}` }],
    }),
    createChecklistItem: builder.mutation<ChecklistItem, { cardId: string; text: string }>({
      query: ({ cardId, text }) => ({
        url: `/cards/${cardId}/checklist`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: (response: ApiEnvelope<ChecklistItem>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `checklist-${cardId}` }],
    }),
    updateChecklistItem: builder.mutation<ChecklistItem, { cardId: string; itemId: string; text?: string; done?: boolean }>({
      query: ({ itemId, text, done }) => ({
        url: `/checklist/${itemId}`,
        method: 'PATCH',
        body: { ...(text !== undefined && { text }), ...(done !== undefined && { done }) },
      }),
      transformResponse: (response: ApiEnvelope<ChecklistItem>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `checklist-${cardId}` }],
    }),
    deleteChecklistItem: builder.mutation<void, { cardId: string; itemId: string }>({
      query: ({ itemId }) => ({
        url: `/checklist/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `checklist-${cardId}` }],
    }),
  }),
});

export const {
  useGetChecklistQuery,
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
} = checklistApi;
