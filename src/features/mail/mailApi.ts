import { api } from '@/lib/api';

export type MailFolder = 'inbox' | 'sent' | 'drafts';

export type RecipientGroup =
  | { type: 'ORGANIZATION' }
  | { type: 'ADMINS' }
  | { type: 'PROJECT'; projectId: string };

export interface MailListItem {
  id: string;
  subject: string;
  body: string;
  isDraft: boolean;
  createdAt: string;
  sentAt: string | null;
  sender: { id: string; name: string };
  _count: { attachments: number };
  read?: boolean;
}

export interface MailAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  downloadUrl: string | null;
}

export interface MailDetail extends MailListItem {
  organizationId: string;
  senderId: string;
  attachments: MailAttachment[];
  recipients: { userId: string; read: boolean; user: { id: string; name: string } }[];
  isRecipient: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const mailApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listMail: builder.query<MailListItem[], { orgId: string; folder: MailFolder }>({
      query: ({ orgId, folder }) => `/organizations/${orgId}/mail?folder=${folder}`,
      transformResponse: (response: ApiEnvelope<MailListItem[]>) => response.data,
      providesTags: (_result, _error, { orgId, folder }) => [{ type: 'Mail', id: `${orgId}-${folder}` }],
    }),
    getUnreadMailCount: builder.query<number, { orgId: string }>({
      query: ({ orgId }) => `/organizations/${orgId}/mail/unread-count`,
      transformResponse: (response: ApiEnvelope<{ count: number }>) => response.data.count,
      providesTags: (_result, _error, { orgId }) => [{ type: 'Mail', id: `${orgId}-unread` }],
    }),
    getMailById: builder.query<MailDetail, string>({
      query: (mailId) => `/mail/${mailId}`,
      transformResponse: (response: ApiEnvelope<MailDetail>) => response.data,
      providesTags: (_result, _error, mailId) => [{ type: 'Mail', id: mailId }],
    }),
    composeMail: builder.mutation<
      MailListItem,
      { orgId: string; subject: string; body: string; recipientUserIds: string[]; recipientGroups: RecipientGroup[]; isDraft: boolean }
    >({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}/mail`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<MailListItem>) => response.data,
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Mail', id: `${orgId}-drafts` },
        { type: 'Mail', id: `${orgId}-sent` },
        { type: 'Mail', id: `${orgId}-unread` },
      ],
    }),
    updateDraft: builder.mutation<
      MailListItem,
      { mailId: string; orgId: string; subject?: string; body?: string; recipientUserIds?: string[]; recipientGroups?: RecipientGroup[]; send?: boolean }
    >({
      query: ({ mailId, orgId: _orgId, ...body }) => ({
        url: `/mail/${mailId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<MailListItem>) => response.data,
      invalidatesTags: (_result, _error, { mailId, orgId }) => [
        { type: 'Mail', id: mailId },
        { type: 'Mail', id: `${orgId}-drafts` },
        { type: 'Mail', id: `${orgId}-inbox` },
        { type: 'Mail', id: `${orgId}-unread` },
      ],
    }),
    deleteMail: builder.mutation<{ deleted: 'draft' | 'inbox' }, { mailId: string; orgId: string }>({
      query: ({ mailId }) => ({
        url: `/mail/${mailId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Mail', id: `${orgId}-drafts` },
        { type: 'Mail', id: `${orgId}-inbox` },
        { type: 'Mail', id: `${orgId}-unread` },
      ],
    }),
    uploadMailAttachment: builder.mutation<MailAttachment, { mailId: string; file: File }>({
      query: ({ mailId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: `/mail/${mailId}/attachments`, method: 'POST', body: formData };
      },
      transformResponse: (response: ApiEnvelope<MailAttachment>) => response.data,
      invalidatesTags: (_result, _error, { mailId }) => [{ type: 'Mail', id: mailId }],
    }),
    deleteMailAttachment: builder.mutation<void, { mailId: string; attachmentId: string }>({
      query: ({ mailId, attachmentId }) => ({
        url: `/mail/${mailId}/attachments/${attachmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { mailId }) => [{ type: 'Mail', id: mailId }],
    }),
  }),
});

export const {
  useListMailQuery,
  useGetUnreadMailCountQuery,
  useGetMailByIdQuery,
  useComposeMailMutation,
  useUpdateDraftMutation,
  useDeleteMailMutation,
  useUploadMailAttachmentMutation,
  useDeleteMailAttachmentMutation,
} = mailApi;
