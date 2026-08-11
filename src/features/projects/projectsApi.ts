import { api } from '@/lib/api';

export type ProjectVisibility = 'ORG' | 'TEAM' | 'PRIVATE';

interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  visibility: ProjectVisibility;
  _count: {
    columns: number;
  };
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  addedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
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
    updateProjectVisibility: builder.mutation<Project, { orgId: string; projectId: string; visibility: ProjectVisibility }>({
      query: ({ orgId, projectId, visibility }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/visibility`,
        method: 'PATCH',
        body: { visibility },
      }),
      transformResponse: (response: { success: boolean; data: Project }) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }, 'Project'],
    }),
    getProjectMembers: builder.query<ProjectMember[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/members`,
      transformResponse: (response: { success: boolean; data: ProjectMember[] }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    addProjectMember: builder.mutation<ProjectMember, { orgId: string; projectId: string; userId: string }>({
      query: ({ orgId, projectId, userId }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    removeProjectMember: builder.mutation<void, { orgId: string; projectId: string; userId: string }>({
      query: ({ orgId, projectId, userId }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectVisibilityMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} = projectsApi;
