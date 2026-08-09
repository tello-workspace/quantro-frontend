import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking korumasi: uygulama baska sitelerin iframe'ine
          // yuklenemez.
          { key: "X-Frame-Options", value: "DENY" },
          // MIME-sniffing'i kapat: tarayici icerigi tipine gore davransin.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer bilgisini sadece kendi originimize gonder (dis siteden
          // token/query verisi sizmasin). strict-origin-when-cross-origin,
          // HTTPS olmayan baglantida hicbir sey gondermez.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Temel CSP. not: 'unsafe-inline' stili, shadcn/ui'nin CSS-in-JS
          // yaklasimi nedeniyle gerekiyor. script-src 'unsafe-eval' icermez;
          // Next.js dev modu gerektirir ama prod derlemesi bu olmadan calisir.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // kendi script'lerimiz + inline (tema script'i, style tagleri)
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // gorseller: kendi + supabase (avatar/cover)
              "img-src 'self' data: blob: https://*.supabase.co",
              // API + websocket (socket.io): backend Render hostu
              "connect-src 'self' https://quantro-backend-1.onrender.com https://*.supabase.co wss://quantro-backend-1.onrender.com ws://localhost:4000 http://localhost:4000",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
