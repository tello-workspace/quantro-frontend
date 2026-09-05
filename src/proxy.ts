import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CSP sertlestirmesi: script-src'te 'unsafe-inline' yerine, her istekte
// tek kullanimlik bir nonce uretilip hem CSP header'ina hem de layout'taki
// tema script'ine (src/app/layout.tsx, dangerouslySetInnerHTML) enjekte
// ediliyor. Boylece kendi script'imiz calismaya devam ederken, saldirganin
// enjekte edebilecegi baska bir inline <script> (nonce'u bilmedigi icin)
// CSP tarafindan engellenir.
//
// Statik headers() (next.config.ts) yerine burada uretilmesinin nedeni:
// nonce her istekte farkli olmali, next.config.ts'teki headers() ise build
// zamaninda sabit deger dondurur.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // React, dev modunda sunucu hata yiginlarini tarayicida yeniden kurmak icin
  // eval kullaniyor; 'unsafe-eval' olmadan `next dev` altinda sayfa "Refused to
  // evaluate a string as JavaScript" hatalariyla doluyor, HMR bozuluyordu.
  // Uretimde ne React ne Next eval kullandigi icin izin sadece dev'e verilir -
  // production CSP'si aynen sert kaliyor.
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    // style-src bu degisikligin kapsami disinda - shadcn/ui'nin CSS-in-JS
    // yaklasimi nedeniyle 'unsafe-inline' burada kaliyor.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://quantro-backend-1.onrender.com https://*.supabase.co wss://quantro-backend-1.onrender.com ws://localhost:4000 http://localhost:4000 https://*.ingest.de.sentry.io",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

export const config = {
  matcher: [
    // _next/static, _next/image ve favicon.ico haric her yol - bunlar HTML
    // dondurmedigi icin CSP/nonce'a ihtiyac duymuyor.
    //
    // missing kosulu next/link prefetch isteklerini disarida birakiyor: prefetch
    // de proxy'den gecerse belgeninkinden FARKLI bir nonce uretilir ve onbellege
    // alinan RSC yaniti, gezinme aninda yururlukteki CSP ile uyusmayan bir nonce
    // tasir. Next dokumaninin onerdigi filtre bu tutarsizligi kapatiyor.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
