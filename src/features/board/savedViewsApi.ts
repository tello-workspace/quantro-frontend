import { api } from '@/lib/api';
import type { Priority } from './services/boardService';

export interface SavedViewFilters {
  search?: string;
  priorities?: Priority[];
  assigneeIds?: string[];
  labelIds?: string[];
}

export interface SavedView {
  id: string;
  projectId: string;
  name: string;
  filters: SavedViewFilters;
  isShared: boolean;
  owner: { id: string; name: string };
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const savedViewsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSavedViews: builder.query<SavedView[], { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/saved-views`,
      transformResponse: (response: ApiEnvelope<SavedView[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'SavedView', id: projectId }],
    }),
    createSavedView: builder.mutation<
      SavedView,
      { projectId: string; name: string; filters: SavedViewFilters; isShared?: boolean }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/saved-views`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<SavedView>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'SavedView', id: projectId }],
    }),
    deleteSavedView: builder.mutation<void, { viewId: string; projectId: string }>({
      query: ({ viewId }) => ({
        url: `/saved-views/${viewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'SavedView', id: projectId }],
    }),
  }),
});

export const { useGetSavedViewsQuery, useCreateSavedViewMutation, useDeleteSavedViewMutation } = savedViewsApi;
