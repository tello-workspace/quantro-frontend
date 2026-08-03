import { api } from '@/lib/api';

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; email: string; avatarUrl?: string | null };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const commentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<Comment[], string>({
      query: (cardId) => `/cards/${cardId}/comments`,
      transformResponse: (response: ApiEnvelope<Comment[]>) => response.data,
      providesTags: (_result, _error, cardId) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
    createComment: builder.mutation<Comment, { cardId: string; text: string }>({
      query: ({ cardId, text }) => ({
        url: `/cards/${cardId}/comments`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: (response: ApiEnvelope<Comment>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
    updateComment: builder.mutation<Comment, { commentId: string; cardId: string; text: string }>({
      query: ({ commentId, text }) => ({
        url: `/comments/${commentId}`,
        method: 'PATCH',
        body: { text },
      }),
      transformResponse: (response: ApiEnvelope<Comment>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
    deleteComment: builder.mutation<void, { commentId: string; cardId: string }>({
      query: ({ commentId }) => ({
        url: `/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;
