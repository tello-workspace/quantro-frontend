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
    dueDate?: string;
    suggestedAssigneeId?: string;
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
      // Bu uc ai:insights limitinde en pahalisi (15/15dk). Sekmeler arasi
      // hizli gidip gelmek gereksiz yere Gemini'yi ve kendi limitimizi
      // tuketmesin diye cache suresi varsayilandan (60sn) uzun tutuluyor.
      keepUnusedDataFor: 300,
    }),
    fillCardWithAi: builder.mutation<
      FillCardResponse['data'],
      { projectId: string; title: string }
    >({
      query: ({ projectId, title }) => ({
        url: '/ai/fill',
        method: 'POST',
        body: { projectId, title },
      }),
      transformResponse: (response: FillCardResponse) => response.data,
    }),
    testAiConfiguration: builder.mutation<
      { success: boolean; message: string },
      { provider: string; apiKey: string; baseUrl?: string | null; model?: string | null }
    >({
      query: (body) => ({
        url: '/ai/test',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { success: boolean; data: { success: boolean; message: string } }) => response.data,
    }),
  }),
});

export const {
  useSendAiMessageMutation,
  useGetAiInsightsQuery,
  useFillCardWithAiMutation,
  useTestAiConfigurationMutation,
} = aiApi;
