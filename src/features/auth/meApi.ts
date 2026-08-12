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
  // GitHub senkronunun yazdigi alanlar.
  githubUsername: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number | null;
  githubSyncedAt: string | null;
  expertiseAreas: string[];
  languages: string[];
  language: string;
  aiProvider: string | null;
  // Ham anahtar API'den asla donmez (bkz. backend auth.service.ts) - sadece
  // kayitli olup olmadigi bilgisi gelir.
  hasAiApiKey: boolean;
  aiBaseUrl: string | null;
  aiModel: string | null;
  dailyDigestEnabled: boolean;
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

export interface ApiTokenOzeti {
  id: string;
  name: string;
  /** Anahtarin bas kismi, ornegin "qtr_a1b2c3d4" - tam anahtar asla donmez. */
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface OlusturulanToken extends ApiTokenOzeti {
  /** Ham anahtar. YALNIZCA olusturma yanitinda gelir, bir daha alinamaz. */
  token: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * GitHub senkron yaniti. `yazilan`/`korunan` sunucunun NE YAPTIGINI anlatiyor:
 * senkron artik kaydettigi icin kullanicinin hangi alanina dokunuldugunu,
 * hangisinin dolu oldugu icin korundugunu bilmesi gerekiyor.
 */
export interface GithubSenkronSonucu {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  languages: string[];
  yazilan: string[];
  korunan: string[];
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
    setDigestPreference: builder.mutation<{ enabled: boolean }, { enabled: boolean }>({
      query: (body) => ({
        url: '/me/digest-preference',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<{ enabled: boolean }>) => response.data,
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
    syncGithubProfile: builder.mutation<GithubSenkronSonucu, string>({
      query: (githubUrl) => ({ url: '/me/github-sync', method: 'POST', body: { githubUrl } }),
      transformResponse: (response: ApiEnvelope<GithubSenkronSonucu>) => response.data,
      // Artik KAYDEDIYOR: profil sunucuda degistigi icin Me tazelenmeli,
      // yoksa arayuz yeni sirket/konum/repo bilgisini gostermez.
      invalidatesTags: ['Me'],
    }),
    listApiTokens: builder.query<ApiTokenOzeti[], void>({
      query: () => '/me/api-tokens',
      transformResponse: (response: ApiEnvelope<ApiTokenOzeti[]>) => response.data,
      providesTags: ['ApiToken'],
    }),
    createApiToken: builder.mutation<OlusturulanToken, string>({
      query: (name) => ({ url: '/me/api-tokens', method: 'POST', body: { name } }),
      transformResponse: (response: ApiEnvelope<OlusturulanToken>) => response.data,
      invalidatesTags: ['ApiToken'],
    }),
    revokeApiToken: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/me/api-tokens/${id}`, method: 'DELETE' }),
      transformResponse: (response: ApiEnvelope<{ id: string }>) => response.data,
      invalidatesTags: ['ApiToken'],
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
  useSetDigestPreferenceMutation,
  useUploadAvatarMutation,
  useSetPresetAvatarMutation,
  useSyncGithubProfileMutation,
  useRemoveAvatarMutation,
  useListApiTokensQuery,
  useCreateApiTokenMutation,
  useRevokeApiTokenMutation,
} = meApi;
