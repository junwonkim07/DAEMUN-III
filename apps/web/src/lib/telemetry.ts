import {
  sanitizeTelemetryText,
  telemetryPath,
  type TelemetryDetails,
  type TelemetryEvent,
  type TelemetryEventType,
} from "@daemun/shared";

const SESSION_KEY = "daemun.diagnostics.session";
const ENDPOINT = "/api/telemetry";
let memorySession: string | undefined;
let started = false;
let emitted = 0;
const MAX_EVENTS_PER_PAGE = 100;

/** An anonymous, per-tab identifier; no account, cookie or IP is recorded. */
export function diagnosticSession(): string {
  if (memorySession) return memorySession;
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return (memorySession = saved);
  } catch { /* Storage can be unavailable in private browsers. */ }
  memorySession = crypto.randomUUID();
  try { sessionStorage.setItem(SESSION_KEY, memorySession); } catch { /* Use memory. */ }
  return memorySession;
}

export function telemetryEvent(
  type: TelemetryEventType,
  details: TelemetryDetails = {},
  documentUrl?: string,
  sentryEventId?: string,
): TelemetryEvent {
  return {
    id: crypto.randomUUID(),
    sessionId: diagnosticSession(),
    type,
    occurredAt: new Date().toISOString(),
    pagePath: telemetryPath(location.pathname),
    documentPath: documentUrl ? telemetryPath(documentUrl) : null,
    release: process.env.NEXT_PUBLIC_APP_RELEASE ?? null,
    sentryEventId: sentryEventId ?? null,
    userAgent: navigator.userAgent.slice(0, 350),
    details,
  };
}

/** Acknowledged writes are used for diagnostics and explicit feedback. */
export async function saveTelemetry(event: TelemetryEvent): Promise<boolean> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [event] }),
      credentials: "omit",
      keepalive: true,
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok && (await response.json()).accepted === 1;
  } catch { return false; }
}

/** Best effort on navigation; a queued beacon is never labelled a saved report. */
export function emitTelemetry(event: TelemetryEvent): void {
  if (emitted++ >= MAX_EVENTS_PER_PAGE) return;
  try {
    const body = JSON.stringify({ events: [event] });
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
    void saveTelemetry(event);
  } catch { /* Monitoring must never break a document link. */ }
}

function documentUrl(href: string): URL | null {
  try {
    const url = new URL(href, location.href);
    if (!/\.((docx?)|pdf)$/i.test(url.pathname)) return null;
    if (url.origin !== location.origin &&
        !(url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com"))) return null;
    return url;
  } catch { return null; }
}

/** A HEAD probe checks reachability, not browser download or Office rendering. */
export async function probeDocument(href: string): Promise<{ event: TelemetryEvent; saved: boolean }> {
  const url = documentUrl(href);
  if (!url) throw new Error("Unsupported document link");
  const start = performance.now();
  let details: TelemetryDetails;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const length = response.headers.get("content-length");
    details = {
      status: response.status,
      outcome: response.ok ? "success" : "http_error",
      contentType: (response.headers.get("content-type") ?? "").slice(0, 200),
      contentDisposition: sanitizeTelemetryText(response.headers.get("content-disposition") ?? "", 300),
      ...(length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length))
        ? { contentLength: Number(length) } : {}),
      message: "HEAD probe only; does not confirm download completion or Office Viewer rendering.",
    };
  } catch (error) {
    details = {
      outcome: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error",
      errorType: error instanceof Error ? error.name.slice(0, 100) : "UnknownError",
      message: "HEAD request unavailable; network, CORS or browser policy may prevent this probe.",
    };
  }
  details.durationMs = Math.min(300_000, Math.round(performance.now() - start));
  const event = telemetryEvent("document_probe", details, url.href);
  return { event, saved: await saveTelemetry(event) };
}

export function startDocumentTelemetry(): void {
  if (started) return;
  started = true;
  const clicked = (event: MouseEvent) => {
    if (event.type === "auxclick" && event.button !== 1) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const url = documentUrl(anchor.href);
    if (!url) return;
    try {
      emitTelemetry(telemetryEvent("document_click", {}, url.href));
      // Navigation is deliberately untouched. If it unloads the page before
      // a probe finishes, only the click may arrive; that is not a failure.
      void probeDocument(url.href).catch(() => undefined);
    } catch { /* Preserve normal navigation on all browsers. */ }
  };
  document.addEventListener("click", clicked, { capture: true });
  document.addEventListener("auxclick", clicked, { capture: true });
}
