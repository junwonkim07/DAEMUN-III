import * as Sentry from "@sentry/nextjs";
import { sanitizeTelemetryText } from "@daemun/shared";
import { emitTelemetry, telemetryEvent } from "./telemetry";

const reported = new WeakSet<Error>();

export function captureBrowserError(error: Error): void {
  if (reported.has(error)) return;
  reported.add(error);
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error);
  } else {
    try {
      emitTelemetry(telemetryEvent("browser_error", {
        errorType: sanitizeTelemetryText(error.name, 100),
        message: sanitizeTelemetryText(error.message),
      }));
    } catch { /* Error reporting cannot break the error boundary. */ }
  }
}
