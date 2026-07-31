import { api } from '@/lib/api';

export type AutomationTrigger = 'CARD_MOVED_TO_COLUMN' | 'CARD_CREATED' | 'SCHEDULED' | 'CARD_DUE_SOON';
export type AutomationActionType =
  | 'ADD_LABEL'
  | 'MOVE_TO_COLUMN'
  | 'ASSIGN_USER'
  | 'SEND_NOTIFICATION'
  | 'CREATE_CARD';

export interface AutomationRule {
  id: string;
  projectId: string;
  name: string;
  trigger: AutomationTrigger;
  triggerColumnId: string | null;
  actionType: AutomationActionType;
  actionLabelId: string | null;
  actionColumnId: string | null;
  actionUserId: string | null;
  actionMessage: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  scheduleDayOfWeek: number | null;
  dueSoonDays: number | null;
}

export interface CreateAutomationRuleInput {
  name: string;
  trigger: AutomationTrigger;
  triggerColumnId?: string | null;
  actionType: AutomationActionType;
  actionLabelId?: string | null;
  actionColumnId?: string | null;
  actionUserId?: string | null;
  actionMessage?: string | null;
  scheduleDayOfWeek?: number | null;
  dueSoonDays?: number | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const automationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAutomationRules: builder.query<AutomationRule[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/automations`,
      transformResponse: (response: ApiEnvelope<AutomationRule[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `automations-${projectId}` }],
    }),
    createAutomationRule: builder.mutation<AutomationRule, { orgId: string; projectId: string } & CreateAutomationRuleInput>({
      query: ({ orgId, projectId, ...body }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/automations`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<AutomationRule>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `automations-${projectId}` }],
    }),
    toggleAutomationRule: builder.mutation<AutomationRule, { ruleId: string; projectId: string; isActive: boolean }>({
      query: ({ ruleId, isActive }) => ({
        url: `/automations/${ruleId}`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (response: ApiEnvelope<AutomationRule>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `automations-${projectId}` }],
    }),
    deleteAutomationRule: builder.mutation<void, { ruleId: string; projectId: string }>({
      query: ({ ruleId }) => ({
        url: `/automations/${ruleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `automations-${projectId}` }],
    }),
  }),
});

export const {
  useGetAutomationRulesQuery,
  useCreateAutomationRuleMutation,
  useToggleAutomationRuleMutation,
  useDeleteAutomationRuleMutation,
} = automationApi;
