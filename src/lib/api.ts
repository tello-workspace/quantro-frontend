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

// Oturum süresi dolduğunda kullanıcıya gösterilecek tek seferlik uyarı.
// 401'i burada yakalayıp sadece bir kez toast basıyoruz - paralel giden
// birden fazla istek aynı anda 401 alırsa kullanıcı 5 toast görmesin.
let oturumSuresiToastuGosterildi = false;

const baseQueryWithLogout = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: object) => {
  const result = await baseQuery(args, api, extraOptions)

  // 401 → token geçersiz/süresi dolmuş. Bu, HERHANGİ bir uçta olabilir
  // (organizasyon, proje, kart, bildirim...) - hepsi aynı token ile gittiği
  // için token'ın süresi dolduğunu gösterir. Sadece /auth/me'ye daraltmak
  // yanlıştı: kullanıcı uzun süre beklerse, ilk istek 401 döner ama logout
  // tetiklenmez, "boş sayfa + disabled butonlar" kalırdı.
  // Oturumsuz erisilebilen sayfalar: burada 401 normal (henuz token yok ya
  // da token'in gecerliligi bu sayfanin KENDI akisiyla ilgisiz) - global
  // "oturum sona erdi" yonlendirmesi bu sayfalarin kendi islerini (OAuth
  // donusu, sifre sifirlama, email dogrulama) yarida kesip /login'e atardi.
  const OTURUMSUZ_SAYFALAR = ['/login', '/register', '/auth/callback', '/reset-password', '/verify-email', '/forgot-password'];

  if (result.error && 'status' in result.error && result.error.status === 401) {
    if (
      typeof window !== 'undefined' &&
      !OTURUMSUZ_SAYFALAR.includes(window.location.pathname)
    ) {
      // Kullanıcıya bilgi ver: boş sayfa yerine "Oturum süreniz doldu".
      if (!oturumSuresiToastuGosterildi) {
        oturumSuresiToastuGosterildi = true;
        // sonner'ı dinamik import ediyoruz - modül seviyesinde import, test
        // ortamında (SSR) sorun çıkarabilir.
        import('sonner').then(({ toast }) => {
          toast.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
        });
      }

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
      // Tam sayfa reload yerine router üzerinden temiz yönlendirme. Ama bu
      // modül store'un dışında; güvenli yol tam sayfa gitmek (store + cache
      // sıfırlanır). 401'de tam sayfa reload doğru davranış - cache'teki
      // yanlış veriler temizlenir.
      window.location.href = '/login'
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithLogout,
  tagTypes: ['Project', 'ProjectMember', 'Card', 'Notification', 'Insight', 'Chat', 'ChangeRequest', 'Me', 'MyAssignedCards', 'ApiToken', 'WatchedCards', 'Document', 'SavedView', 'ProjectTemplate', 'Webhook'],
  endpoints: () => ({}),
})
