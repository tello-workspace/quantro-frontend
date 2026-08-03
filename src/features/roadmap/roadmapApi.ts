import { api } from '@/lib/api';

export interface RoadmapCard {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  storyPoints: number | null;
  parentCardId: string | null;
  columnId: string;
  columnName: string;
  isDone: boolean;
  assignees: { id: string; name: string; avatarUrl: string | null }[];
  labels: { id: string; name: string; color: string }[];
}

export interface Roadmap {
  projectId: string;
  projectName: string;
  cards: RoadmapCard[];
  dependencies: { blockerId: string; blockedId: string }[];
  parents: { id: string; title: string }[];
}

export const roadmapApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectRoadmap: builder.query<Roadmap, { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/roadmap`,
      transformResponse: (response: { success: boolean; data: Roadmap }) => response.data,
      providesTags: (_r, _e, { projectId }) => [{ type: 'Insight', id: `roadmap-${projectId}` }],
    }),
  }),
});

export const { useGetProjectRoadmapQuery } = roadmapApi;
