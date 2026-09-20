import { z } from "zod";

// Shared compiles with ES libraries only; both browser and Node expose URL.
const UniversalURL = (globalThis as unknown as {
  URL: new (value: string, base?: string) => { protocol: string; host: string; pathname: string };
}).URL;

export const telemetryEventTypes = [
  "document_click", "document_probe", "document_feedback",
  "browser_error", "server_error", "sentry_error",
] as const;

const pathSchema = z.string().max(512).regex(/^\/(?!\/)[^\s?#]*$/);
const optionalText = (max: number) => z.string().max(max).nullish().transform((v) => v ?? null);

export const telemetryDetailsSchema = z.object({
  status: z.number().int().min(0).max(599).optional(),
  durationMs: z.number().finite().min(0).max(300_000).optional(),
  contentType: z.string().max(200).optional(),
  contentDisposition: z.string().max(300).optional(),
  contentLength: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  outcome: z.enum([
    "success", "http_error", "network_error", "timeout", "opened",
    "viewer_error", "download_failed", "unknown",
  ]).optional(),
  errorType: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
}).strict();

/** Validate the wire format before sanitizing: unknown fields are never retained. */
export const telemetryEventSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid().nullish().transform((v) => v ?? null),
  type: z.enum(telemetryEventTypes),
  occurredAt: z.iso.datetime({ offset: true }),
  pagePath: pathSchema,
  documentPath: pathSchema.nullish().transform((v) => v ?? null),
  release: optionalText(120),
  sentryEventId: z.string().regex(/^[a-f0-9]{32}$/).nullish().transform((v) => v ?? null),
  userAgent: optionalText(350),
  details: telemetryDetailsSchema,
}).strict();

export const telemetryBatchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(10),
}).strict();

export type TelemetryDetails = z.infer<typeof telemetryDetailsSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type TelemetryEventType = TelemetryEvent["type"];
export type TelemetryRecord = TelemetryEvent & {
  /** Browser events remain client-supplied reports, never authoritative facts. */
  source: "browser" | "server";
  createdAt: string;
};

/** Keep error summaries useful without recording credentials, emails or URL queries. */
export function sanitizeTelemetryText(value: string, max = 500): string {
  // Encoded emails/queries can occur inside error URLs; decode before redaction.
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Keep malformed text bounded. */ }
  return decoded
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\b(?:https?|postgres(?:ql)?):\/\/[^\s<>"']+/gi, (raw) => {
      try {
        const url = new UniversalURL(raw);
        return `${url.protocol}//${url.host}${url.pathname}`;
      } catch { return "[url]"; }
    })
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (value: string, offset: number, text: string) => {
      // UA product versions (Chrome/142.0.0.0, Edg/142.0.0.0) identify
      // affected browsers. A URL host has // before its IP, not a product/.
      const prefix = text.slice(0, offset);
      return /(?:^|[ ();])[A-Za-z][A-Za-z0-9._-]*\/$/.test(prefix) ? value : "[ip]";
    })
    .replace(/\[(?:[0-9a-f]{0,4}:){2,}[0-9a-f:.]*\]/gi, "[ip]")
    .replace(/(?<![\w])(?:[0-9a-f]{0,4}:){2,}[0-9a-f:.]+/gi, "[ip]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [redacted]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[redacted]")
    .replace(/\b([A-Z0-9_-]*(?:api[_-]?key|password|passwd|token|secret|authorization|cookie|session[_-]?id)[A-Z0-9_-]*)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[redacted]")
    .replace(/[?#][^\s<>"']+/g, "[query]")
    .slice(0, max);
}

/** Use before emitting a browser/server event; raw API inputs must already be paths. */
export function telemetryPath(value: string): string {
  try {
    const path = new UniversalURL(value, "https://telemetry.invalid").pathname;
    return encodeURI(sanitizeTelemetryText(path, 512)).slice(0, 512);
  } catch { return "/"; }
}

/** Defense in depth: all externally supplied text is sanitized before persistence. */
export function sanitizeTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  const details: TelemetryDetails = { ...event.details };
  for (const key of ["contentType", "contentDisposition", "errorType", "message"] as const) {
    const value = details[key];
    if (value !== undefined) details[key] = sanitizeTelemetryText(value);
  }
  return {
    ...event,
    pagePath: telemetryPath(event.pagePath),
    documentPath: event.documentPath === null ? null : telemetryPath(event.documentPath),
    release: event.release === null ? null : sanitizeTelemetryText(event.release, 120),
    userAgent: event.userAgent === null ? null : sanitizeTelemetryText(event.userAgent, 350),
    details,
  };
}
