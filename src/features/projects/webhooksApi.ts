import { api } from '@/lib/api';

export const WEBHOOK_EVENTS = [
  'CARD_CREATED',
  'CARD_MOVED',
  'CARD_ASSIGNED',
  'CARD_COMMENTED',
  'CHANGE_REQUEST_APPROVED',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface CreatedWebhook extends Webhook {
  secret: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const webhooksApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWebhooks: builder.query<Webhook[], { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/webhooks`,
      transformResponse: (response: ApiEnvelope<Webhook[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Webhook', id: projectId }],
    }),
    createWebhook: builder.mutation<CreatedWebhook, { projectId: string; url: string; events: WebhookEvent[] }>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/webhooks`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<CreatedWebhook>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Webhook', id: projectId }],
    }),
    updateWebhook: builder.mutation<
      Webhook,
      { webhookId: string; projectId: string; isActive?: boolean; events?: WebhookEvent[]; url?: string }
    >({
      query: ({ webhookId, projectId: _projectId, ...body }) => ({
        url: `/webhooks/${webhookId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<Webhook>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Webhook', id: projectId }],
    }),
    deleteWebhook: builder.mutation<void, { webhookId: string; projectId: string }>({
      query: ({ webhookId }) => ({
        url: `/webhooks/${webhookId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Webhook', id: projectId }],
    }),
  }),
});

export const {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
} = webhooksApi;
