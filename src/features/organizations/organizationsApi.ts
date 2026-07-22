import { api } from '@/lib/api';

interface OrgMember {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: { id: string; name: string; email: string };
}
interface OrgDetail {
  id:string;
  name:string;
  description: string | null;
  ownerId: string;
  myRole: 'ADMIN' | 'MEMBER';
  members: OrgMember[];
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  role: 'ADMIN' | 'MEMBER';
  memberCount: number;
  projectCount: number;
}

interface OrgsResponse {
  success: boolean;
  data: Organization[];
}

export interface PendingInvitation {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  invitedUser: { id: string; name: string; email: string };
}

export const organizationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyOrganizations: builder.query<Organization[], void>({
      query: () => '/organizations',
      transformResponse: (response: OrgsResponse) => response.data,
      providesTags: ['Project'],
    }),
    addMember: builder.mutation<{ id: string }, { orgId: string; email: string; role?: 'ADMIN' | 'MEMBER' }>({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
        getOrganizationById: builder.query<OrgDetail, { orgId: string }>({
      query: ({ orgId }) => `/organizations/${orgId}`,
      transformResponse: (response: { success: boolean; data: OrgDetail }) => response.data,
      providesTags: (_result, _error, { orgId }) => [{ type: 'Project', id: orgId }],
    }),
    updateOrganization: builder.mutation<OrgDetail, { orgId: string; name?: string; description?: string }>({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Project', id: orgId }, 'Project'],
    }),
    deleteOrganization: builder.mutation<void, { orgId: string }>({
      query: ({ orgId }) => ({
        url: `/organizations/${orgId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    removeMember: builder.mutation<void, { orgId: string; userId: string }>({
      query: ({ orgId, userId }) => ({
        url: `/organizations/${orgId}/members?userId=${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Project', id: orgId }],
    }),
    getPendingInvitations: builder.query<PendingInvitation[], { orgId: string }>({
      query: ({ orgId }) => `/organizations/${orgId}/invitations`,
      transformResponse: (response: { success: boolean; data: PendingInvitation[] }) => response.data,
      providesTags: (_result, _error, { orgId }) => [{ type: 'Project', id: orgId }],
    }),
    cancelInvitation: builder.mutation<void, { orgId: string; invitationId: string }>({
      query: ({ orgId, invitationId }) => ({
        url: `/organizations/${orgId}/invitations?invitationId=${invitationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Project', id: orgId }],
    }),
    acceptInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/invitations/${invitationId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Project', 'Notification'],
    }),
    declineInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/invitations/${invitationId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetMyOrganizationsQuery,
  useAddMemberMutation,
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useRemoveMemberMutation,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useGetPendingInvitationsQuery,
  useCancelInvitationMutation,
} = organizationsApi;
