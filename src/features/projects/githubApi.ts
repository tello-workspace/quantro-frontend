import { api } from '@/lib/api';

export type GithubLinkKind = 'BRANCH' | 'PULL_REQUEST';

/** Kart detayinda gosterilen branch/PR rozeti. */
export interface GithubCardLink {
  id: string;
  kind: GithubLinkKind;
  /** BRANCH icin dal adi, PULL_REQUEST icin PR numarasi. */
  reference: string;
  title: string | null;
  url: string;
  /** open | closed | merged */
  state: string | null;
  authorLogin: string | null;
}

export interface GithubLink {
  id: string;
  projectId: string;
  owner: string;
  repo: string;
  isActive: boolean;
  branchColumnId: string | null;
  prOpenColumnId: string | null;
  prMergedColumnId: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

/** POST yaniti secret'i BIR KEZ tasir; sonraki okumalarda hic donmez. */
export interface CreatedGithubLink extends GithubLink {
  secret: string;
}

export interface GithubLinkKolonEslemesi {
  branchColumnId?: string | null;
  prOpenColumnId?: string | null;
  prMergedColumnId?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const githubApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Baglanti kurulmamissa backend null donuyor: istemci "henuz kurulmamis"
    // durumunu 404'u hata gibi ele almadan gosterebiliyor.
    getGithubLink: builder.query<GithubLink | null, { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/github-link`,
      transformResponse: (response: ApiEnvelope<GithubLink | null>) => response.data,
      providesTags: (_result, _error, { projectId }) => [{ type: 'GithubLink', id: projectId }],
    }),
    createGithubLink: builder.mutation<
      CreatedGithubLink,
      { projectId: string; owner: string; repo: string } & GithubLinkKolonEslemesi
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/github-link`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<CreatedGithubLink>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'GithubLink', id: projectId }],
    }),
    updateGithubLink: builder.mutation<
      GithubLink,
      { projectId: string; owner?: string; repo?: string; isActive?: boolean } & GithubLinkKolonEslemesi
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/github-link`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<GithubLink>) => response.data,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'GithubLink', id: projectId }],
    }),
    deleteGithubLink: builder.mutation<void, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/projects/${projectId}/github-link`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'GithubLink', id: projectId }],
    }),
  }),
});

export const {
  useGetGithubLinkQuery,
  useCreateGithubLinkMutation,
  useUpdateGithubLinkMutation,
  useDeleteGithubLinkMutation,
} = githubApi;

/**
 * Kart anahtarindan git dal adi uretir: QNT-42 + "Mail zinciri kur" ->
 * "feat/qnt-42-mail-zinciri-kur".
 *
 * Anahtarin dal adinda gecmesi, entegrasyonun karti bulmasinin tek yolu.
 * Butonla kopyalanabilir olmasi, kullanicinin elle yazarken anahtari yanlis
 * yazma ihtimalini ortadan kaldiriyor.
 */
export function branchAdiUret(cardKey: string, title: string): string {
  const slug = title
    .toLowerCase()
    // Turkce karakterler ASCII karsiligina: git dal adlari teknik olarak
    // unicode kabul ediyor ama araclar arasi tasinabilirlik icin ASCII daha
    // guvenli.
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    // slice ortadan kesip sonda tire birakabilir.
    .replace(/-+$/, '');

  const anahtar = cardKey.toLowerCase();
  return slug ? `feat/${anahtar}-${slug}` : `feat/${anahtar}`;
}
