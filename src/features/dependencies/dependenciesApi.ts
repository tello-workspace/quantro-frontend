import { api } from '@/lib/api';

export const dependenciesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    addDependency: builder.mutation<void, { cardId: string; blockerId: string }>({
      query: ({ cardId, blockerId }) => ({
        url: `/cards/${cardId}/dependencies`,
        method: 'POST',
        body: { blockerId },
      }),
    }),
    removeDependency: builder.mutation<void, { cardId: string; blockerId: string }>({
      query: ({ cardId, blockerId }) => ({
        url: `/cards/${cardId}/dependencies/${blockerId}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const { useAddDependencyMutation, useRemoveDependencyMutation } = dependenciesApi;
