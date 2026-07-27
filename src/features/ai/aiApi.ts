import { api } from '@/lib/api';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  success: boolean;
  data: { reply: string };
}

interface InsightsResponse {
  success: boolean;
  data: { insights: string };
}

interface FillCardResponse {
  success: boolean;
  data: {
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  };
}

export const aiApi = api.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<string, { projectId: string; messages: ChatMessage[] }>({
      query: ({ projectId, messages }) => ({
        url: '/ai/chat',
        method: 'POST',
        body: { projectId, messages },
      }),
      transformResponse: (response: ChatResponse) => response.data.reply,
    }),
    getAiInsights: builder.query<string, string>({
      query: (projectId) => `/ai/insights?projectId=${projectId}`,
      transformResponse: (response: InsightsResponse) => response.data.insights,
    }),
    fillCardWithAi: builder.mutation<
      { description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' },
      { projectId: string; title: string }
    >({
      query: ({ projectId, title }) => ({
        url: '/ai/fill',
        method: 'POST',
        body: { projectId, title },
      }),
      transformResponse: (response: FillCardResponse) => response.data,
    }),
  }),
});

export const {
  useSendAiMessageMutation,
  useGetAiInsightsQuery,
  useFillCardWithAiMutation,
} = aiApi;
