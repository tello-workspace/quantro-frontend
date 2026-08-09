import { api } from '@/lib/api';

export interface ProjectDocument {
  id: string;
  projectId: string;
  uploaderId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  downloadUrl: string | null;
  uploader: { id: string; name: string };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const documentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDocuments: builder.query<ProjectDocument[], string>({
      query: (projectId) => `/projects/${projectId}/documents`,
      transformResponse: (response: ApiEnvelope<ProjectDocument[]>) => response.data,
      providesTags: (_result, _error, projectId) => [{ type: 'Document', id: projectId }],
    }),
    uploadDocument: builder.mutation<ProjectDocument, { projectId: string; file: File }>({
      query: ({ projectId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/projects/${projectId}/documents`,
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: ApiEnvelope<ProjectDocument>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    deleteDocument: builder.mutation<void, { projectId: string; documentId: string }>({
      query: ({ projectId, documentId }) => ({
        url: `/projects/${projectId}/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} = documentsApi;
