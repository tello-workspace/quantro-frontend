import { api } from '@/lib/api';

export interface InsightUser {
  id: string;
  name: string;
}

export interface StaleCard {
  id: string;
  title: string;
  columnId: string;
  columnName: string;
  lastActivityAt: string;
  assignees: InsightUser[];
}

export interface WorkloadEntry {
  userId: string;
  userName: string;
  cardCount: number;
  weightedLoad: number;
  overloaded: boolean;
}

export interface WipViolation {
  columnId: string;
  columnName: string;
  wipLimit: number;
  cardCount: number;
}

export interface DeadlineRiskCard {
  id: string;
  title: string;
  columnId: string;
  columnName: string;
  dueDate: string;
  assignees: InsightUser[];
}

export interface ProjectInsights {
  generatedAt: string;
  staleCards: StaleCard[];
  workload: WorkloadEntry[];
  wipViolations: WipViolation[];
  deadlineRisks: DeadlineRiskCard[];
}

export interface WeeklySummary {
  since: string;
  cardsCreated: number;
  cardsCompleted: number;
  commentsAdded: number;
  mostActiveMember: { userId: string; userName: string; activityCount: number } | null;
  pendingStaleCount: number;
}

export const insightsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectInsights: builder.query<ProjectInsights, { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/insights`,
      transformResponse: (response: { success: boolean; data: ProjectInsights }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Insight', id: projectId }],
    }),
    getWeeklySummary: builder.query<WeeklySummary, { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/summary`,
      transformResponse: (response: { success: boolean; data: WeeklySummary }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Insight', id: projectId }],
    }),
  }),
});

export const { useGetProjectInsightsQuery, useGetWeeklySummaryQuery } = insightsApi;
