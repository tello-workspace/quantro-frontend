import * as Sentry from "@sentry/nextjs";

// Next 16 kural: sentry.client.config.ts yerine bu dosya (bkz.
// node_modules/next/dist/docs/.../instrumentation-client.md) - hydration'dan
// once, ilk HTML yuklendikten sonra calisir.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
