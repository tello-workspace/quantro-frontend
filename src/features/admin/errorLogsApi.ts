import { api } from '@/lib/api';

export interface ErrorLogEntry {
  id: string;
  message: string;
  stack: string | null;
  method: string;
  path: string;
  statusCode: number;
  userId: string | null;
  createdAt: string;
}

export const errorLogsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getErrorLogs: builder.query<ErrorLogEntry[], { limit?: number } | void>({
      query: (args) => `/error-logs?limit=${args?.limit ?? 50}`,
      transformResponse: (response: { success: boolean; data: ErrorLogEntry[] }) => response.data,
    }),
  }),
});

export const { useGetErrorLogsQuery } = errorLogsApi;
