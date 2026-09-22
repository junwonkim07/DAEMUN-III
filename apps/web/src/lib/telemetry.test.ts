import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { diagnosticSession, probeDocument, saveTelemetry, telemetryEvent } from "./telemetry";
import { scrubSentryEvent } from "./sentry-options";

const originalFetch = globalThis.fetch;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const values = new Map<string, string>();
Object.defineProperty(globalThis, "location", { configurable: true, value: {
  origin: "https://daemun.org", href: "https://daemun.org/guide?token=private", pathname: "/guide",
} });
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
} });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "TestBrowser/1.0" } });
afterEach(() => { globalThis.fetch = originalFetch; });
process.on("exit", () => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
});

test("document events share a tab reference and omit URL queries and fragments", () => {
  const first = telemetryEvent("document_click", {}, "https://daemun.org/docs/a.docx?token=private#word");
  const second = telemetryEvent("document_click", {}, "/docs/b.docx");
  assert.equal(first.sessionId, second.sessionId);
  assert.equal(first.sessionId, diagnosticSession());
  assert.notEqual(first.id, second.id);
  assert.equal(first.pagePath, "/guide");
  assert.equal(first.documentPath, "/docs/a.docx");
  assert.ok(!JSON.stringify(first).includes("private"));
});

test("an acknowledged probe stores headers but never claims download completion", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init });
    return init?.method === "HEAD"
      ? new Response(null, { status: 200, headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "content-disposition": "inline; filename=a.docx", "content-length": "1234",
        } })
      : Response.json({ accepted: 1 });
  }) as typeof fetch;
  const result = await probeDocument("/docs/a.docx");
  assert.equal(result.saved, true);
  assert.equal(result.event.details.status, 200);
  assert.equal(result.event.details.contentLength, 1234);
  assert.equal(result.event.details.outcome, "success");
  assert.match(result.event.details.message!, /does not confirm download/);
  assert.equal(calls[0].init?.credentials, "omit");
  assert.equal(calls[1].url, "/api/telemetry");
});

test("storage errors are not presented as saved reports", async () => {
  globalThis.fetch = (async () => Response.json({ error: "unavailable" }, { status: 503 })) as typeof fetch;
  assert.equal(await saveTelemetry(telemetryEvent("document_feedback", { outcome: "viewer_error" })), false);
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  assert.equal(await saveTelemetry(telemetryEvent("document_click")), false);
});

test("probes distinguish file HTTP failures from network failures and reject arbitrary hosts", async () => {
  globalThis.fetch = (async (_input, init) => init?.method === "HEAD"
    ? new Response(null, { status: 404 }) : Response.json({ accepted: 1 })) as typeof fetch;
  assert.equal((await probeDocument("/docs/missing.docx")).event.details.outcome, "http_error");
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "HEAD") throw new TypeError("Failed to fetch");
    return Response.json({ accepted: 1 });
  }) as typeof fetch;
  assert.equal((await probeDocument("/docs/a.docx")).event.details.outcome, "network_error");
  await assert.rejects(() => probeDocument("https://attacker.test/a.docx"), /Unsupported/);
  await assert.rejects(() => probeDocument("/api/auth/session"), /Unsupported/);
});

test("Sentry retains useful stack locations while removing account/request context", () => {
  const event = scrubSentryEvent({
    type: undefined,
    event_id: "a".repeat(32),
    user: { email: "alice@example.org" },
    extra: { password: "private" },
    request: { url: "https://daemun.org/login?token=private", data: "private", headers: { Cookie: "private" } },
    contexts: { account: { email: "alice@example.org" } },
    tags: { email: "alice@example.org", diagnostic_session: "test-session" },
    exception: { values: [{ type: "TypeError", value: "alice@example.org failed token=private", mechanism: { type: "generic", data: { body: "private" } }, stacktrace: { frames: [{ filename: "https://daemun.org/app.js?token=private", lineno: 42, vars: { password: "private" }, context_line: "private", pre_context: ["private"] }] } }] },
  });
  assert.ok(!JSON.stringify(event).includes("private"));
  assert.ok(!JSON.stringify(event).includes("alice@example.org"));
  assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].lineno, 42);
  assert.equal(event.tags?.diagnostic_session, "test-session");
});
