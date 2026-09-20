import * as Sentry from "@sentry/nextjs";
import { sanitizeTelemetryText } from "@daemun/shared";
import { diagnosticSession, emitTelemetry, startDocumentTelemetry, telemetryEvent } from "./lib/telemetry";
import { scrubSentryEvent, sentryDataCollection, sentrySummary } from "./lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_RELEASE,
  sendDefaultPii: false,
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0,
  // Error diagnostics only: no session video, form contents or console logs.
  integrations: (defaults) => defaults.filter((integration) => integration.name !== "Breadcrumbs"),
  beforeSend(event) {
    const clean = scrubSentryEvent(event);
    try {
      clean.tags = { ...clean.tags, diagnostic_session: diagnosticSession() };
      emitTelemetry(telemetryEvent("sentry_error", sentrySummary(clean), undefined, clean.event_id));
    } catch { /* Reporting must not break Sentry delivery. */ }
    return clean;
  },
});

startDocumentTelemetry();

// Neon remains useful even if the optional hosted Sentry DSN is unavailable.
if (!dsn) {
  const report = (error: unknown) => {
    try {
      emitTelemetry(telemetryEvent("browser_error", {
        errorType: error instanceof Error ? error.name.slice(0, 100) : "Error",
        message: sanitizeTelemetryText(error instanceof Error ? error.message : String(error)),
      }));
    } catch { /* Monitoring must not interrupt the page. */ }
  };
  window.addEventListener("error", (event) => report(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => report(event.reason));
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
