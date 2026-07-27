import { api } from '@/lib/api';

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const labelsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLabels: builder.query<Label[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/labels`,
      transformResponse: (response: ApiEnvelope<Label[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Card', id: `labels-${projectId}` }],
    }),
    createLabel: builder.mutation<Label, { orgId: string; projectId: string; name: string; color: string }>({
      query: ({ orgId, projectId, ...body }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/labels`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<Label>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Card', id: `labels-${projectId}` }],
    }),
    deleteLabel: builder.mutation<void, { labelId: string; projectId: string }>({
      query: ({ labelId }) => ({
        url: `/labels/${labelId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Card', id: `labels-${projectId}` }],
    }),
    attachLabel: builder.mutation<void, { cardId: string; labelId: string }>({
      query: ({ cardId, labelId }) => ({
        url: `/cards/${cardId}/labels`,
        method: 'POST',
        body: { labelId },
      }),
    }),
    detachLabel: builder.mutation<void, { cardId: string; labelId: string; projectId?: string }>({
      query: ({ cardId, labelId }) => ({
        url: `/cards/${cardId}/labels`,
        method: 'DELETE',
        body: { labelId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => projectId ? [{ type: 'Card', id: `labels-${projectId}` }] : [],
    }),
  }),
});

export const {
  useGetLabelsQuery,
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useAttachLabelMutation,
  useDetachLabelMutation,
} = labelsApi;
