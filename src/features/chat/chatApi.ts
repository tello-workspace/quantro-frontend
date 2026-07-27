import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  organizationId: string;
  authorId: string;
  text: string;
  createdAt: string;
  // email socket'ten gelen mesajlarda bulunmuyor
  author: { id: string; name: string; email?: string };
}

// Socket yayini REST cevabindan farkli sekilde geliyor: ic ice author
// nesnesi yerine duz authorId/authorName alanlari var. Listeye eklemeden
// once normalize edilmezse arayuz message.author.name'de patliyor.
export interface ChatMessageSocketPayload {
  id: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export function socketPayloadToMessage(payload: ChatMessageSocketPayload): ChatMessage {
  return {
    id: payload.id,
    organizationId: payload.organizationId,
    authorId: payload.authorId,
    text: payload.text,
    createdAt: payload.createdAt,
    author: { id: payload.authorId, name: payload.authorName },
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getChatMessages: builder.query<ChatMessage[], string>({
      query: (orgId) => `/organizations/${orgId}/messages`,
      transformResponse: (response: ApiEnvelope<ChatMessage[]>) => response.data,
      providesTags: (_result, _error, orgId) => [{ type: 'Chat', id: orgId }],
    }),
    sendChatMessage: builder.mutation<ChatMessage, { orgId: string; text: string }>({
      query: ({ orgId, text }) => ({
        url: `/organizations/${orgId}/messages`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: (response: ApiEnvelope<ChatMessage>) => response.data,
      // Gonderen kendi mesajini socket'ten de alir; listeyi aninda
      // guncellemek icin cache'e elle ekliyoruz (mukerrer id engelli).
      async onQueryStarted({ orgId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', orgId, (draft) => {
              if (!draft.some((m) => m.id === created.id)) draft.push(created);
            }),
          );
        } catch {
          // Hata durumunda listeyi degistirme; bilesen toast gosteriyor
        }
      },
    }),
  }),
});

export const { useGetChatMessagesQuery, useSendChatMessageMutation } = chatApi;
