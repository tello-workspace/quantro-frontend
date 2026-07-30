import { api } from '@/lib/api';
import type { Priority } from '@/features/board/services/boardService';

export interface CardTemplate {
  id: string;
  projectId: string;
  name: string;
  title: string;
  description: string | null;
  priority: Priority;
  storyPoints: number | null;
  checklistItems: string[];
  createdById: string;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const templateApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<CardTemplate[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/templates`,
      transformResponse: (response: ApiEnvelope<CardTemplate[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `templates-${projectId}` }],
    }),
    saveCardAsTemplate: builder.mutation<CardTemplate, { cardId: string; projectId: string; name: string }>({
      query: ({ cardId, name }) => ({
        url: `/cards/${cardId}/save-as-template`,
        method: 'POST',
        body: { name },
      }),
      transformResponse: (response: ApiEnvelope<CardTemplate>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `templates-${projectId}` }],
    }),
    deleteTemplate: builder.mutation<void, { templateId: string; projectId: string }>({
      query: ({ templateId }) => ({ url: `/templates/${templateId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `templates-${projectId}` }],
    }),
    createCardFromTemplate: builder.mutation<unknown, { templateId: string; columnId: string }>({
      query: ({ templateId, columnId }) => ({
        url: `/templates/${templateId}/create-card`,
        method: 'POST',
        body: { columnId },
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => response.data,
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useSaveCardAsTemplateMutation,
  useDeleteTemplateMutation,
  useCreateCardFromTemplateMutation,
} = templateApi;
