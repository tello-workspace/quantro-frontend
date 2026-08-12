import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Server Components/Route Handlers'ta yakalanan hatalari Sentry'ye tasir -
// bkz. node_modules/next/dist/docs/.../instrumentation.md (Next 16, onRequestError).
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
