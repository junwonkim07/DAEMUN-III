import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  sanitizeTelemetryText, telemetryBatchSchema, telemetryPath,
  type TelemetryEvent,
} from "@daemun/shared";
import { createTelemetryRoutes } from "./telemetry";
import { telemetryOrigins } from "../lib/telemetry-origins";
import { apiErrorReport, persistApiError } from "../lib/telemetry-error";

const timestamp = Date.parse("2026-09-20T12:00:00Z");
function event(patch: Record<string, unknown> = {}) {
  return {
    id: randomUUID(), sessionId: randomUUID(), type: "document_probe",
    occurredAt: new Date(timestamp).toISOString(), pagePath: "/guide",
    documentPath: "/docs/rules.docx", details: { status: 200, outcome: "success" },
    ...patch,
  };
}
function setup(save?: (events: TelemetryEvent[], source: "browser" | "server") => Promise<number>) {
  const saved: TelemetryEvent[] = [];
  const ids = new Set<string>();
  const routes = createTelemetryRoutes({
    origins: ["https://daemun.example"], secret: "test-internal-secret",
    now: () => timestamp, identify: () => "test-client",
    limit: () => ({ ok: true, retryAfterSec: 0 }),
    save: save ?? (async (events) => {
      const fresh = events.filter((item) => !ids.has(item.id));
      fresh.forEach((item) => { ids.add(item.id); saved.push(item); });
      return fresh.length;
    }),
  });
  const post = (events: unknown[], headers: Record<string, string> = {}, internal = false) => (
    internal ? routes.internalRoutes : routes.publicRoutes
  ).request("/", {
    method: "POST", body: JSON.stringify({ events }),
    headers: { "content-type": "application/json", origin: "https://daemun.example", ...headers },
  });
  return { ...routes, post, saved };
}

test("public batches are sanitized, captured with request UA, and retries are idempotent", async () => {
  const { post, saved } = setup();
  const input = event({ userAgent: "spoofed UA", details: {
    message: "alice@example.org failed https://host.test/file?token=abcdef password=hidden",
  } });
  assert.deepEqual(await (await post([input], { "user-agent": "Browser/1.0" })).json(), { accepted: 1 });
  assert.equal(saved[0]?.userAgent, "Browser/1.0");
  assert.equal(saved[0]?.details.message, "[email] failed https://host.test/file password=[redacted]");
  assert.deepEqual(await (await post([input])).json(), { accepted: 0 });
  assert.equal(saved.length, 1);
});

test("strict schema rejects stacks, extra keys, full URLs and query strings", async () => {
  const { post, saved } = setup();
  for (const item of [
    event({ stack: "private stack" }), event({ details: { requestBody: "private" } }),
    event({ pagePath: "/guide?email=alice@example.org" }),
    event({ documentPath: "https://host.test/a.docx" }),
    event({ sentryEventId: "not-an-event-id" }),
    event({ details: { message: "x".repeat(501) } }),
  ]) assert.equal((await post([item])).status, 400);
  assert.equal(saved.length, 0);
});

test("public ingestion rejects foreign/missing origins and trusted server-error claims", async () => {
  const { post, saved } = setup();
  assert.equal((await post([event()], { origin: "https://attacker.test" })).status, 403);
  assert.equal((await post([event()], { origin: "null" })).status, 403);
  assert.equal((await post([event({ type: "server_error" })])).status, 400);
  assert.equal(saved.length, 0);
});

test("internal ingestion requires bearer auth and accepts only server error summaries", async () => {
  const { post, saved } = setup();
  assert.equal((await post([event({ type: "server_error" })], {}, true)).status, 401);
  const headers = { authorization: "Bearer test-internal-secret" };
  assert.equal((await post([event()], headers, true)).status, 400);
  assert.equal((await post([event({ type: "sentry_error" })], headers, true)).status, 200);
  assert.equal(saved.length, 1);
});

test("beacon string payloads work; batch and body size are bounded", async () => {
  const { post } = setup();
  assert.equal((await post([event()], { "content-type": "text/plain;charset=UTF-8" })).status, 200);
  assert.equal((await post(Array.from({ length: 11 }, () => event()))).status, 400);
  assert.equal((await post([event({ details: { message: "x".repeat(13 * 1024) } })])).status, 413);
});

test("rejects stale/future timestamps so client clocks cannot corrupt the timeline", async () => {
  const { post } = setup();
  for (const offset of [-8 * 24 * 60 * 60_000, 6 * 60_000]) {
    assert.equal((await post([event({ occurredAt: new Date(timestamp + offset).toISOString() })])).status, 400);
  }
});

test("rate limit returns retry hint without persisting a report", async () => {
  let called = false;
  const { publicRoutes } = createTelemetryRoutes({
    origins: ["https://daemun.example"], secret: "", identify: () => "hashed-ip",
    limit: () => ({ ok: false, retryAfterSec: 42 }),
    save: async () => { called = true; return 1; },
  });
  const res = await publicRoutes.request("/", { method: "POST", headers: { origin: "https://daemun.example" } });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "42");
  assert.equal(called, false);
});

test("sessions behind the same school IP have independent quotas and every batch session is charged once", async () => {
  let stored = 0;
  const schoolIp = randomUUID();
  const sessionA = randomUUID();
  const sessionB = randomUUID();
  const { publicRoutes } = createTelemetryRoutes({
    origins: ["https://daemun.example"], secret: "", now: () => timestamp,
    identify: () => schoolIp,
    save: async (events) => { stored += events.length; return events.length; },
  });
  const send = (sessions: Array<string | null>) => publicRoutes.request("/", {
    method: "POST", headers: { origin: "https://daemun.example", "content-type": "application/json" },
    body: JSON.stringify({ events: sessions.map((sessionId) => event({ sessionId })) }),
  });
  for (let i = 0; i < 59; i++) assert.equal((await send([sessionA])).status, 200);
  // The first visitor has already sent more than the former IP-wide quota.
  for (let i = 0; i < 59; i++) assert.equal((await send([sessionB])).status, 200);
  assert.equal((await send([sessionA, sessionA, sessionB])).status, 200);
  assert.equal((await send([sessionA])).status, 429);
  assert.equal((await send([sessionB])).status, 429);
  // A third visitor and a null-session report are unaffected by A/B's quotas.
  assert.equal((await send([randomUUID()])).status, 200);
  assert.equal((await send([null])).status, 200);
  assert.equal(stored, 123);
});

test("public null-session traffic uses the 600-request coarse ceiling; private traffic keeps 120", async () => {
  const calls: Array<{ key: string; ceiling: number }> = [];
  const { publicRoutes, internalRoutes } = createTelemetryRoutes({
    origins: ["https://daemun.example"], secret: "private-secret", now: () => timestamp,
    identify: () => "school-ip",
    limit: (key, ceiling) => { calls.push({ key, ceiling }); return { ok: true, retryAfterSec: 0 }; },
    save: async () => 1,
  });
  assert.equal((await publicRoutes.request("/", {
    method: "POST", headers: { origin: "https://daemun.example", "content-type": "application/json" },
    body: JSON.stringify({ events: [event({ sessionId: null })] }),
  })).status, 200);
  assert.equal((await internalRoutes.request("/", {
    method: "POST", headers: { authorization: "Bearer private-secret", "content-type": "application/json" },
    body: JSON.stringify({ events: [event({ type: "server_error" })] }),
  })).status, 200);
  assert.deepEqual(calls, [
    { key: "telemetry:browser:school-ip", ceiling: 600 },
    { key: "telemetry:server:school-ip", ceiling: 120 },
  ]);
});

test("storage errors are explicit and do not expose database details", async () => {
  const { post } = setup(async () => { throw new Error("postgres://user:password@host/private"); });
  const res = await post([event()]);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "Telemetry storage is unavailable" });
});

test("the request does not acknowledge a report until persistence completes", async () => {
  let finish!: () => void;
  const persisted = new Promise<void>((resolve) => { finish = resolve; });
  const { post } = setup(async () => { await persisted; return 1; });
  let completed = false;
  const response = Promise.resolve(post([event()])).then((res) => { completed = true; return res; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  finish();
  assert.equal((await response).status, 200);
});

test("sanitizers remove credentials, tokens and navigation query/fragment", () => {
  const result = sanitizeTelemetryText('Bearer abc123 token="private token" api_key=sk-supersecret alice@example.org postgres://u:p@db.test/data?sslmode=require');
  assert.equal(result, 'Bearer [redacted] token=[redacted] api_key=[redacted] [email] postgres://db.test/data');
  assert.equal(telemetryPath("https://daemun.example/guide?token=secret#section"), "/guide");
  assert.equal(sanitizeTelemetryText("alice%40example.org 192.0.2.10 https://[::1]/health"), "[email] [ip] https://[ip]/health");
  assert.equal(sanitizeTelemetryText('access_token="sensitive" refreshToken=also-sensitive client_secret=private 2001:db8::1'), 'access_token=[redacted] refreshToken=[redacted] client_secret=[redacted] [ip]');
  assert.equal(telemetryPath("/docs/a%20b.docx"), "/docs/a%20b.docx");
  assert.equal(telemetryBatchSchema.safeParse({ events: [event()], requestBody: "secret" }).success, false);
});

test("production public aliases and explicit additional origins reach ingestion", async () => {
  const origins = telemetryOrigins(["https://daemun.org", "https://admin.example"], " https://additional.example,https://daemun.org ", true);
  assert.equal(origins.filter((origin) => origin === "https://daemun.org").length, 1);
  const { publicRoutes } = createTelemetryRoutes({
    origins, secret: "", now: () => timestamp, identify: () => "test-client",
    limit: () => ({ ok: true, retryAfterSec: 0 }), save: async () => 1,
  });
  for (const origin of ["https://daemun.org", "https://www.daemun.org", "https://daemun-web.vercel.app", "https://additional.example", "https://admin.example"]) {
    const res = await publicRoutes.request("/", {
      method: "POST", headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ events: [event()] }),
    });
    assert.equal(res.status, 200, origin);
  }
  const rejected = telemetryOrigins(["http://localhost:3000", "https://user:secret@private.example"], "ftp://files.example,not-a-url", true);
  assert.deepEqual(rejected, ["https://daemun.org", "https://www.daemun.org", "https://daemun-web.vercel.app"]);
  assert.ok(telemetryOrigins(["http://localhost:3000"], "", false).includes("http://localhost:3000"));
});

test("browser versions survive privacy redaction while literal IPs do not", async () => {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0";
  assert.equal(sanitizeTelemetryText(ua, 350), ua);
  assert.equal(sanitizeTelemetryText("Chrome/142.0.0.0 Edge/142.0.0.0 connected 192.0.2.10 https://192.0.2.10/file"), "Chrome/142.0.0.0 Edge/142.0.0.0 connected [ip] https://[ip]/file");
  const { post, saved } = setup();
  assert.equal((await post([event()], { "user-agent": ua })).status, 200);
  assert.equal(saved[0]?.userAgent, ua);
});

test("API exception summaries redact secrets and await server-source persistence", async () => {
  const error = new TypeError("alice@example.org failed token=secret https://host.test/api?credential=private");
  const report = apiErrorReport(error, { path: "/api/public/site?secret=hidden", userAgent: "Browser/1.0" });
  assert.equal(report.type, "server_error");
  assert.equal(report.pagePath, "/api/public/site");
  assert.equal(report.details.errorType, "TypeError");
  assert.equal(report.details.message, "[email] failed token=[redacted] https://host.test/api");
  assert.equal("stack" in report.details, false);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  let completed = false;
  const saved = persistApiError(report, async (events, source) => {
    assert.equal(source, "server");
    assert.equal(events[0], report);
    await pending;
    return 1;
  }).then(() => { completed = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  finish();
  await saved;
});

test("API exception persistence skips telemetry failures and tolerates storage outage", async () => {
  for (const path of ["/api/public/telemetry", "/api/internal/telemetry", "/api/admin/telemetry", "/api/public/telemetry/invalid"]) {
    let called = false;
    await persistApiError(apiErrorReport(new Error("failure"), { path }), async () => { called = true; return 1; });
    assert.equal(called, false, path);
  }
  await assert.doesNotReject(persistApiError(apiErrorReport(new Error("failure"), { path: "/api/public/site" }), async () => {
    throw new Error("database is unavailable");
  }));
});
