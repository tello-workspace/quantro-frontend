import { api } from '@/lib/api';

export type ImportFormat = 'TRELLO_JSON' | 'JIRA_CSV';

export interface ImportPreview {
  format: ImportFormat;
  totalCards: number;
  columns: { sourceId: string; name: string; cardCount: number; suggestedColumnId: string | null }[];
  existingColumns: { id: string; name: string }[];
  labels: { name: string; cardCount: number }[];
  assignees: { identifier: string; cardCount: number; matchedUserId: string | null; matchedUserName: string | null }[];
}

export type ColumnMappingEntry =
  | { mode: 'existing'; columnId: string }
  | { mode: 'new'; name: string }
  | { mode: 'skip' };

export interface ApplyImportResult {
  createdColumns: number;
  createdCards: number;
  createdLabels: number;
  skippedCards: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const importApi = api.injectEndpoints({
  endpoints: (builder) => ({
    previewImport: builder.mutation<ImportPreview, { projectId: string; format: ImportFormat; fileContent: string }>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/import/preview`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<ImportPreview>) => response.data,
    }),
    applyImport: builder.mutation<
      ApplyImportResult,
      {
        projectId: string;
        format: ImportFormat;
        fileContent: string;
        columnMapping: Record<string, ColumnMappingEntry>;
        userMapping: Record<string, string | null>;
      }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/import`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<ApplyImportResult>) => response.data,
    }),
  }),
});

export const { usePreviewImportMutation, useApplyImportMutation } = importApi;
