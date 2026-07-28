import { api } from '@/lib/api';

export interface Me {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  title: string | null;
  bio: string | null;
  experience: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  expertiseAreas: string[];
  languages: string[];
}

export interface UpdateProfileInput {
  title?: string | null;
  bio?: string | null;
  experience?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  expertiseAreas?: string[];
  languages?: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const meApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => '/auth/me',
      transformResponse: (response: ApiEnvelope<Me>) => response.data,
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation<Me, UpdateProfileInput>({
      query: (body) => ({
        url: '/auth/me',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<Me>) => response.data,
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { useGetMeQuery, useUpdateProfileMutation } = meApi;
