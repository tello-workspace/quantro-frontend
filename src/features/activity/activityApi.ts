import { api } from '@/lib/api';

export type ActivityType =
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_MOVED'
  | 'CARD_ASSIGNED'
  | 'CARD_COMPLETED'
  | 'COMMENT_ADDED'
  | 'MEMBER_JOINED'
  | 'DEPENDENCY_ADDED';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  createdAt: string;
  data: Record<string, unknown> | null;
  user: { id: string; name: string };
  card: { id: string; title: string } | null;
}

export const activityApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectActivities: builder.query<ActivityEntry[], { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/activities`,
      transformResponse: (response: { success: boolean; data: ActivityEntry[] }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Insight', id: `activity-${projectId}` }],
    }),
  }),
});

export const { useGetProjectActivitiesQuery } = activityApi;
