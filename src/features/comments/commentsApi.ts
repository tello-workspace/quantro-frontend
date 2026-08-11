import { api } from '@/lib/api';

export interface CommentReaction {
  userId: string;
  emoji: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string | null;
  parentCommentId?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: { id: string; name: string } | null;
  author: CommentAuthor;
  reactions?: CommentReaction[];
  // Sadece kok yorumlarda gelir - tek seviye thread (bkz. backend semasi).
  replies?: Comment[];
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
    createComment: builder.mutation<Comment, { cardId: string; text: string; parentCommentId?: string }>({
      query: ({ cardId, text, parentCommentId }) => ({
        url: `/cards/${cardId}/comments`,
        method: 'POST',
        body: parentCommentId ? { text, parentCommentId } : { text },
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
    resolveComment: builder.mutation<Comment, { commentId: string; cardId: string; resolved: boolean }>({
      query: ({ commentId, resolved }) => ({
        url: `/comments/${commentId}/resolve`,
        method: resolved ? 'POST' : 'DELETE',
      }),
      transformResponse: (response: ApiEnvelope<Comment>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
    toggleCommentReaction: builder.mutation<
      CommentReaction[],
      { commentId: string; cardId: string; emoji: string }
    >({
      query: ({ commentId, emoji }) => ({
        url: `/comments/${commentId}/reactions`,
        method: 'POST',
        body: { emoji },
      }),
      transformResponse: (response: ApiEnvelope<CommentReaction[]>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `comments-${cardId}` }],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useResolveCommentMutation,
  useToggleCommentReactionMutation,
} = commentsApi;
