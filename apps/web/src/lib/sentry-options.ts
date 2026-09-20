import type { ErrorEvent } from "@sentry/nextjs";
import { sanitizeTelemetryText } from "@daemun/shared";

export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};

/** Strip account/request data before events leave the site. */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;
  event.contexts = event.contexts?.trace ? { trace: event.contexts.trace } : undefined;
  event.tags = Object.fromEntries(Object.entries(event.tags ?? {})
    .filter(([key]) => ["diagnostic_session", "document_id", "runtime"].includes(key))
    .map(([key, value]) => [key, sanitizeTelemetryText(String(value), 120)]));
  if (event.transaction) event.transaction = sanitizeTelemetryText(event.transaction, 200);
  delete event.logentry;
  if (event.request) {
    const rawUrl = event.request.url;
    event.request = { method: event.request.method };
    if (rawUrl) event.request.url = sanitizeTelemetryText(rawUrl, 512);
  }
  if (event.message) event.message = sanitizeTelemetryText(event.message);
  event.breadcrumbs = event.breadcrumbs?.filter((entry) => entry.category === "document").map((entry) => ({
    category: entry.category,
    level: entry.level,
    timestamp: entry.timestamp,
    message: sanitizeTelemetryText(entry.message ?? ""),
  }));
  for (const exception of event.exception?.values ?? []) {
    if (exception.mechanism) delete exception.mechanism.data;
    if (exception.value) exception.value = sanitizeTelemetryText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars;
      delete frame.context_line;
      delete frame.pre_context;
      delete frame.post_context;
      if (frame.filename) frame.filename = sanitizeTelemetryText(frame.filename, 512);
      if (frame.abs_path) frame.abs_path = sanitizeTelemetryText(frame.abs_path, 512);
    }
  }
  return event;
}

export function sentrySummary(event: ErrorEvent) {
  const exception = event.exception?.values?.at(-1);
  return {
    errorType: sanitizeTelemetryText(exception?.type ?? "Error", 100),
    message: sanitizeTelemetryText(exception?.value ?? event.message ?? "Application error"),
  };
}
