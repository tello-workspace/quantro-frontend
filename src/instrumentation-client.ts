import * as Sentry from "@sentry/nextjs";

// Next 16 kural: sentry.client.config.ts yerine bu dosya (bkz.
// node_modules/next/dist/docs/.../instrumentation-client.md) - hydration'dan
// once, ilk HTML yuklendikten sonra calisir.

// Sifre sifirlama / e-posta dogrulama linkleri ham token'i query string'de
// tasiyor (?token=...). Sentry hem hata olaylarina hem de orneklenen
// transaction'lara tam sayfa URL'ini ekledigi icin bu token ucuncu tarafa
// cikiyordu. Sayfa kendi URL'ini temizlese bile pageload transaction'i URL
// temizlenmeden once olusabildigi icin maskelemeyi burada, gonderim aninda
// yapiyoruz.
const TOKEN_QUERY = /([?&]token=)[^&#]*/gi;

type MaskelenebilirOlay = {
  request?: { url?: string };
  transaction?: string;
  breadcrumbs?: { data?: { [key: string]: unknown } }[];
};

function maskeleUrl(deger: string): string {
  return deger.replace(TOKEN_QUERY, '$1[Filtered]');
}

function maskeleOlay(event: MaskelenebilirOlay): void {
  if (event.request?.url) event.request.url = maskeleUrl(event.request.url);
  if (event.transaction) event.transaction = maskeleUrl(event.transaction);
  for (const iz of event.breadcrumbs ?? []) {
    if (!iz.data) continue;
    for (const alan of ['url', 'from', 'to']) {
      const deger = iz.data[alan];
      if (typeof deger === 'string') iz.data[alan] = maskeleUrl(deger);
    }
  }
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend: (event) => {
      maskeleOlay(event);
      return event;
    },
    beforeSendTransaction: (event) => {
      maskeleOlay(event);
      return event;
    },
  });
}
