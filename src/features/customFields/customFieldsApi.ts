import { api } from '@/lib/api';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';

export interface CustomFieldDefinition {
  id: string;
  projectId: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  position: number;
}

export interface CardCustomFieldValue {
  cardId: string;
  fieldId: string;
  value: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const customFieldsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCustomFields: builder.query<CustomFieldDefinition[], { orgId: string; projectId: string }>({
      query: ({ orgId, projectId }) => `/organizations/${orgId}/projects/${projectId}/custom-fields`,
      transformResponse: (response: ApiEnvelope<CustomFieldDefinition[]>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `custom-fields-${projectId}` }],
    }),
    createCustomField: builder.mutation<
      CustomFieldDefinition,
      { orgId: string; projectId: string; name: string; type: CustomFieldType; options?: string[] }
    >({
      query: ({ orgId, projectId, ...body }) => ({
        url: `/organizations/${orgId}/projects/${projectId}/custom-fields`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<CustomFieldDefinition>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `custom-fields-${projectId}` }],
    }),
    deleteCustomField: builder.mutation<void, { fieldId: string; projectId: string }>({
      query: ({ fieldId }) => ({
        url: `/custom-fields/${fieldId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: `custom-fields-${projectId}` }],
    }),
    setCustomFieldValue: builder.mutation<CardCustomFieldValue, { cardId: string; fieldId: string; value: string | null }>({
      query: ({ cardId, fieldId, value }) => ({
        url: `/cards/${cardId}/custom-fields/${fieldId}`,
        method: 'PATCH',
        body: { value },
      }),
      transformResponse: (response: ApiEnvelope<CardCustomFieldValue>) => response.data,
    }),
  }),
});

export const {
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useSetCustomFieldValueMutation,
} = customFieldsApi;
