import { api } from '@/lib/api';

export type DependencyRelationType = 'BLOCKS' | 'RELATES_TO' | 'DUPLICATES' | 'CLONES';

export const dependenciesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    addDependency: builder.mutation<
      void,
      { cardId: string; blockerId: string; relationType?: DependencyRelationType }
    >({
      query: ({ cardId, blockerId, relationType }) => ({
        url: `/cards/${cardId}/dependencies`,
        method: 'POST',
        body: { blockerId, relationType },
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
