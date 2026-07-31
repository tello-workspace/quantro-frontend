import { api } from '@/lib/api';
import type { Priority, TaskLabel } from '@/features/board/services/boardService';

export interface AssignedCard {
  id: string;
  title: string;
  priority: Priority;
  storyPoints: number | null;
  dueDate: string | null;
  lastActivityAt: string;
  columnId: string;
  columnName: string;
  projectId: string;
  projectName: string;
  organizationId: string;
  organizationName: string;
  labels: TaskLabel[];
  isBlocked: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignedCards: builder.query<AssignedCard[], void>({
      query: () => '/me/assigned-cards',
      transformResponse: (response: ApiEnvelope<AssignedCard[]>) => response.data,
      providesTags: ['MyAssignedCards'],
    }),
  }),
});

export const { useGetMyAssignedCardsQuery } = dashboardApi;
