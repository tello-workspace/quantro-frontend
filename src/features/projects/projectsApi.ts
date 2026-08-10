import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  _count: {
    columns: number;
  };
}

interface ProjectsResponse {
  success: boolean;
  data: Project[];
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], { orgId: string }>({
      query: ({ orgId }) => `/organizations/${orgId}/projects`,
      transformResponse: (response: ProjectsResponse) => response.data,
      providesTags: ['Project'],
    }),
    getProjectById: builder.query<Project, { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}`,
      transformResponse: (response: { success: boolean; data: Project }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
      updateProject: builder.mutation<Project, { orgId: string; projectId: string; name?: string; description?: string }>({
      query: ({ orgId, projectId, ...body }) => ({
        url: `/organizations/${orgId}/projects/${projectId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: { success: boolean; data: Project }) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }, 'Project'],
    }),
     deleteProject: builder.mutation<void, { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => ({
        url: `/organizations/${orgId}/projects/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    createProject: builder.mutation<Project, { orgId: string; name: string; description?: string; key?: string }>({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}/projects`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: { success: boolean; data: Project }) => response.data,
      invalidatesTags: ['Project'],
    }),
  }),
});

 export const { useGetProjectsQuery, useGetProjectByIdQuery, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation } = projectsApi;
