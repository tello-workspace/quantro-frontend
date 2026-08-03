import { api } from '@/lib/api';

export interface Me {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  experience: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  expertiseAreas: string[];
  languages: string[];
  language: string;
  aiProvider: string | null;
  // Ham anahtar API'den asla donmez (bkz. backend auth.service.ts) - sadece
  // kayitli olup olmadigi bilgisi gelir.
  hasAiApiKey: boolean;
  aiBaseUrl: string | null;
  aiModel: string | null;
}

export interface UpdateProfileInput {
  title?: string | null;
  bio?: string | null;
  experience?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  expertiseAreas?: string[];
  languages?: string[];
  language?: string | null;
  aiProvider?: string | null;
  aiApiKey?: string | null;
  aiBaseUrl?: string | null;
  aiModel?: string | null;
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
    uploadAvatar: builder.mutation<{ id: string; avatarUrl: string | null }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/me/avatar', method: 'POST', body: formData };
      },
      transformResponse: (response: ApiEnvelope<{ id: string; avatarUrl: string | null }>) => response.data,
      invalidatesTags: ['Me'],
    }),
    setPresetAvatar: builder.mutation<{ id: string; avatarUrl: string | null }, string>({
      query: (preset) => ({ url: '/me/avatar', method: 'PUT', body: { preset } }),
      transformResponse: (response: ApiEnvelope<{ id: string; avatarUrl: string | null }>) => response.data,
      invalidatesTags: ['Me'],
    }),
    removeAvatar: builder.mutation<{ id: string; avatarUrl: string | null }, void>({
      query: () => ({ url: '/me/avatar', method: 'DELETE' }),
      transformResponse: (response: ApiEnvelope<{ id: string; avatarUrl: string | null }>) => response.data,
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useSetPresetAvatarMutation,
  useRemoveAvatarMutation,
} = meApi;
