import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { persistSentryError } from "./lib/server-telemetry";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await Sentry.captureRequestError(error, request, context);
  } else {
    await persistSentryError({
      type: undefined,
      request: { url: request.path },
      exception: { values: [{
        type: error instanceof Error ? error.name : "Error",
        value: error instanceof Error ? error.message : String(error),
      }] },
    });
  }
};
