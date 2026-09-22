import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, sentryDataCollection } from "./lib/sentry-options";
import { persistSentryError } from "./lib/server-telemetry";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_RELEASE,
  sendDefaultPii: false,
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0,
  beforeSend: async (event) => {
    const clean = scrubSentryEvent(event);
    await persistSentryError(clean);
    return clean;
  },
});
