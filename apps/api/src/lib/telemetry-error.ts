import { randomUUID } from "node:crypto";
import {
  sanitizeTelemetryEvent, sanitizeTelemetryText, telemetryPath, type TelemetryEvent,
} from "@daemun/shared";

export function apiErrorReport(error: Error, request: {
  path: string; userAgent?: string; release?: string;
}): TelemetryEvent {
  return sanitizeTelemetryEvent({
    id: randomUUID(),
    sessionId: null,
    type: "server_error",
    occurredAt: new Date().toISOString(),
    pagePath: telemetryPath(request.path),
    documentPath: null,
    release: request.release ? sanitizeTelemetryText(request.release, 120) : null,
    sentryEventId: null,
    userAgent: request.userAgent ? sanitizeTelemetryText(request.userAgent, 350) : null,
    details: {
      status: 500,
      errorType: sanitizeTelemetryText(error.name || "Error", 100),
      message: sanitizeTelemetryText(error.message),
    },
  });
}

export async function persistApiError(
  report: TelemetryEvent,
  save: (events: TelemetryEvent[], source: "server") => Promise<number>,
): Promise<void> {
  // Never recursively persist a failure of telemetry's own ingest/list path.
  if (/^\/api\/(?:[^/]+\/)*telemetry(?:\/|$)/.test(report.pagePath)) return;
  try {
    await save([report], "server");
  } catch {
    console.warn("[telemetry] API error persistence unavailable");
  }
}
