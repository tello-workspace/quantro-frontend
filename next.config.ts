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
          // Content-Security-Policy burada YOK: nonce-tabanli CSP artik
          // src/proxy.ts icinde, istek basina uretiliyor (bkz. o dosyadaki
          // yorum). Ayni header'i burada sabit degerle de donmek, tarayicida
          // iki CSP birden uygulanmasina (kesisim) yol acar ve script-src
          // icin 'unsafe-inline' burada kalirsa nonce korumasini etkisiz
          // birakir.
        ],
      },
    ];
  },
};

export default nextConfig;
