import { api } from '@/lib/api';

export interface RoadmapCard {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
    // TimelineView'da cubugun uclarini surukleyip yeni sure kaydeder. PATCH
    // sonrasi roadmap tag'i gecersiz kilinir ki query yeniden cekilsin ve
    // cubuk DB'deki gercek surelerle hizalansin. startDate/dueDate null
    // gonderilirse backend ilgili alani temizler.
    updateCardDates: builder.mutation<
      void,
      { cardId: string; startDate: string | null; dueDate: string | null }
    >({
      query: ({ cardId, startDate, dueDate }) => ({
        url: `/cards/${cardId}`,
        method: 'PATCH',
        body: { startDate, dueDate },
      }),
      invalidatesTags: ['Insight'],
    }),
  }),
});

export const { useGetProjectRoadmapQuery, useUpdateCardDatesMutation } = roadmapApi;
