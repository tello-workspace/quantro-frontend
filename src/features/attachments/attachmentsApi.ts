import { api } from '@/lib/api';

export interface Attachment {
  id: string;
  cardId: string;
  uploaderId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  downloadUrl: string | null;
  uploader: { id: string; name: string };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const attachmentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAttachments: builder.query<Attachment[], string>({
      query: (cardId) => `/cards/${cardId}/attachments`,
      transformResponse: (response: ApiEnvelope<Attachment[]>) => response.data,
      providesTags: (_result, _error, cardId) => [{ type: 'Card', id: `attachments-${cardId}` }],
    }),
    uploadAttachment: builder.mutation<Attachment, { cardId: string; file: File }>({
      query: ({ cardId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/cards/${cardId}/attachments`,
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: ApiEnvelope<Attachment>) => response.data,
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `attachments-${cardId}` }],
    }),
    deleteAttachment: builder.mutation<void, { cardId: string; attachmentId: string }>({
      query: ({ cardId, attachmentId }) => ({
        url: `/cards/${cardId}/attachments/${attachmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { cardId }) => [{ type: 'Card', id: `attachments-${cardId}` }],
    }),
  }),
});

export const {
  useGetAttachmentsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} = attachmentsApi;
