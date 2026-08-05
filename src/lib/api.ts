import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query'

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: (headers) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

const baseQueryWithLogout = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: object) => {
  const result = await baseQuery(args, api, extraOptions)

  // 401 → token geçersiz/süresi dolmuş → logout + full reload (store sıfırlanır).
  // Yalnızca /auth/me'de yapıyoruz: oturumun kendisiyle ilgili tek istek o.
  // Diğer uçların 401'i, o kaynağa özel bir sorun olabilir (örneğin geçici
  // RBAC değişikliği, silinen kaynak) ve kullanıcıyı anında oturumdan atmak
  // yerine o isteği hatalı işaretlemek daha güvenli. Reload'ta paralel giden
  // yardımcı isteklerden biri 401 dönerse kullanıcının oturumu bozulmaz.
  const yol = typeof args === 'string' ? args : args.url;
  const oturumUcu = typeof yol === 'string' && yol.includes('/auth/me');

  // Teşhis: 401 dönen isteği görmek için geçici log. Sorun çözülünce kaldır.
  if (result.error && 'status' in result.error && result.error.status === 401) {
    console.error('[api] 401 alindi:', typeof yol === 'string' ? yol : String(args), '-> oturumUcu:', oturumUcu);
  }

  if (oturumUcu && result.error && 'status' in result.error && result.error.status === 401) {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/register'
    ) {
      localStorage.removeItem('token')
      // Supabase oturumu AYRI bir localStorage kaydi; burada temizlenmezse
      // kendi token'imiz silindikten sonra bile ayakta kaliyor ve bir sonraki
      // "Google ile giris"te /auth/callback'teki getSession() bu ESKI oturumu
      // okuyup onceki hesapla giris yapiyordu. Elle cikista (Header) zaten
      // yapiliyordu, otomatik cikista atlanmisti.
      const { supabase } = await import('@/lib/supabaseClient')
      if (supabase) {
        try {
          await supabase.auth.signOut()
        } catch {
          // Cikis yonlendirmesini engellemesin - token zaten silindi.
        }
      }
      window.dispatchEvent(new Event('auth:changed'))
      window.location.href = '/login'
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithLogout,
  tagTypes: ['Project', 'Card', 'Notification', 'Insight', 'Chat', 'ChangeRequest', 'Me', 'MyAssignedCards', 'ApiToken'],
  endpoints: () => ({}),
})
