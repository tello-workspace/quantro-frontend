import { api } from '@/lib/api';

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: { cards: number };
}

export interface SprintBurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

export interface SprintBurndown {
  sprintId: string;
  totalPoints: number;
  startDate: string;
  endDate: string;
  series: SprintBurndownPoint[];
}

export interface SprintRolloverSummary {
  rolledOverCount: number;
  backlogCount: number;
  nextSprintId: string | null;
  nextSprintName: string | null;
}

export interface UpdateSprintResult extends Sprint {
  rollover: SprintRolloverSummary | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const sprintsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSprints: builder.query<Sprint[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/sprints`,
      transformResponse: (response: ApiEnvelope<Sprint[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `sprints-${projectId}` }],
    }),
    createSprint: builder.mutation<
      Sprint,
      { orgId: string; projectId: string; name: string; goal?: string | null; startDate?: string | null; endDate?: string | null }
    >({
      query: ({ orgId, projectId, ...body }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/sprints`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<Sprint>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `sprints-${projectId}` }],
    }),
    updateSprint: builder.mutation<
      UpdateSprintResult,
      { sprintId: string; projectId: string; status?: SprintStatus; name?: string; goal?: string | null }
    >({
      query: ({ sprintId, projectId: _projectId, ...body }) => ({
        url: `/sprints/${sprintId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<UpdateSprintResult>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `sprints-${projectId}` }],
    }),
    deleteSprint: builder.mutation<void, { sprintId: string; projectId: string }>({
      query: ({ sprintId }) => ({
        url: `/sprints/${sprintId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `sprints-${projectId}` }],
    }),
    getSprintBurndown: builder.query<SprintBurndown, { sprintId: string }>({
      query: ({ sprintId }) => `/sprints/${sprintId}/burndown`,
      transformResponse: (response: ApiEnvelope<SprintBurndown>) => response.data,
    }),
  }),
});

export const {
  useGetSprintsQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useGetSprintBurndownQuery,
} = sprintsApi;
