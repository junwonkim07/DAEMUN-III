import { telemetryPath, type TelemetryEvent } from "@daemun/shared";
import type { ErrorEvent } from "@sentry/nextjs";
import { sentrySummary } from "./sentry-options";

export async function persistSentryError(event: ErrorEvent): Promise<void> {
  const secret = process.env.TELEMETRY_INGEST_SECRET;
  const api = process.env.API_URL;
  if (!secret || !api) return;
  const record: TelemetryEvent = {
    id: crypto.randomUUID(),
    sessionId: null,
    type: event.event_id ? "sentry_error" : "server_error",
    occurredAt: new Date().toISOString(),
    pagePath: telemetryPath(event.request?.url ?? "/"),
    documentPath: null,
    release: process.env.NEXT_PUBLIC_APP_RELEASE ?? null,
    sentryEventId: event.event_id ?? null,
    userAgent: null,
    details: sentrySummary(event),
  };
  try {
    const response = await fetch(`${api}/api/internal/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ events: [record] }),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) console.warn("[telemetry] server event persistence failed", response.status);
  } catch { console.warn("[telemetry] server event persistence unavailable"); }
}
