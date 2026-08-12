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
  avatarUrl?: string | null;
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

export type CardType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';

export interface ProjectInsights {
  generatedAt: string;
  staleCards: StaleCard[];
  workload: WorkloadEntry[];
  wipViolations: WipViolation[];
  deadlineRisks: DeadlineRiskCard[];
  typeBreakdown: Record<CardType, number>;
}

export interface WeeklySummary {
  since: string;
  cardsCreated: number;
  cardsCompleted: number;
  commentsAdded: number;
  mostActiveMember: { userId: string; userName: string; activityCount: number } | null;
  pendingStaleCount: number;
}

export interface CumulativeFlow {
  projectId: string;
  days: number;
  columns: { id: string; name: string }[];
  series: { date: string; counts: Record<string, number> }[];
  totalCards: number;
  cardsWithMoveHistory: number;
}

export interface CycleTime {
  projectId: string;
  overallAverageDays: number | null;
  sampledCards: number;
  totalDoneCards: number;
  weeklySeries: { weekStart: string; averageDays: number | null; count: number }[];
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
    getCumulativeFlow: builder.query<CumulativeFlow, { projectId: string; days?: number }>({
      query: ({ projectId, days }) => `/projects/${projectId}/cumulative-flow${days ? `?days=${days}` : ''}`,
      transformResponse: (response: { success: boolean; data: CumulativeFlow }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Insight', id: projectId }],
    }),
    getCycleTime: builder.query<CycleTime, { projectId: string; weeks?: number }>({
      query: ({ projectId, weeks }) => `/projects/${projectId}/cycle-time${weeks ? `?weeks=${weeks}` : ''}`,
      transformResponse: (response: { success: boolean; data: CycleTime }) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Insight', id: projectId }],
    }),
  }),
});

export const { useGetProjectInsightsQuery, useGetWeeklySummaryQuery, useGetCumulativeFlowQuery, useGetCycleTimeQuery } =
  insightsApi;
