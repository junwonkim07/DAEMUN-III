import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  sanitizeTelemetryEvent, sanitizeTelemetryText, telemetryBatchSchema,
  type TelemetryEvent,
} from "@daemun/shared";
import { clientIp } from "../lib/client-ip";
import { rateLimit } from "../lib/rate-limit";

type Dependencies = {
  origins: string[];
  secret: string;
  save: (events: TelemetryEvent[], source: "browser" | "server") => Promise<number>;
  now?: () => number;
  identify?: (c: Context) => string;
  limit?: typeof rateLimit;
};

const ipSalt = randomUUID();
const MAX_BODY = 12 * 1024;

/** IP buckets contain salted hashes; no raw IP is kept in the limiter or database. */
function clientKey(c: Context) {
  return createHash("sha256").update(ipSalt).update(clientIp(c)).digest("hex");
}

function matchesSecret(actual: string | undefined, secret: string): boolean {
  if (!secret || !actual?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(actual.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** Dependency injection keeps ingestion tests independent of auth and a live database. */
export function createTelemetryRoutes(deps: Dependencies) {
  const origins = new Set(deps.origins.flatMap((url) => {
    try { return [new URL(url).origin]; } catch { return []; }
  }));
  const now = deps.now ?? Date.now;
  const limit = deps.limit ?? rateLimit;
  const identify = deps.identify ?? clientKey;

  function router(source: "browser" | "server") {
    return new Hono()
      .use("*", async (c, next) => {
        if (source === "browser") {
          // Same-origin browser requests include Origin; no wildcard previews or null origins.
          if (!origins.has(c.req.header("origin") ?? "")) {
            return c.json({ error: "Origin is not allowed" }, 403);
          }
        } else if (!matchesSecret(c.req.header("authorization"), deps.secret)) {
          return c.json({ error: "Unauthorized" }, 401);
        }
        // A school can put many independent visitors behind one public IP.
        // This coarse ceiling protects parsing; validated anonymous sessions
        // get their own smaller quota below.
        const result = limit(`telemetry:${source}:${identify(c)}`, source === "browser" ? 600 : 120, 60_000);
        if (!result.ok) {
          c.header("Retry-After", String(result.retryAfterSec));
          return c.json({ error: "Too many reports" }, 429);
        }
        await next();
      })
      .use("*", bodyLimit({ maxSize: MAX_BODY, onError: (c) => c.json({ error: "Report is too large" }, 413) }))
      .post("/", async (c) => {
        // Blob/application-json beacons and fetch use JSON; text/plain is accepted
        // for sendBeacon(string), with the same Origin and schema checks.
        const mediaType = c.req.header("content-type")?.split(";")[0]?.trim();
        if (mediaType !== "application/json" && mediaType !== "text/plain") {
          return c.json({ error: "Expected JSON" }, 415);
        }
        let raw: unknown;
        try { raw = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
        const parsed = telemetryBatchSchema.safeParse(raw);
        if (!parsed.success) return c.json({ error: "Invalid telemetry report" }, 400);
        const timestamp = now();
        if (parsed.data.events.some((event) => {
          const age = timestamp - Date.parse(event.occurredAt);
          return age < -5 * 60_000 || age > 7 * 24 * 60 * 60_000 ||
            (source === "browser" && event.type === "server_error") ||
            (source === "server" && event.type !== "server_error" && event.type !== "sentry_error");
        })) return c.json({ error: "Invalid event source or timestamp" }, 400);

        if (source === "browser") {
          const sessions = new Set(parsed.data.events.flatMap((event) => event.sessionId ? [event.sessionId] : []));
          // Charge each session once per batch, even when several of its
          // events are batched. Anonymous null-session reports use only the
          // coarse IP ceiling; a caller cannot invent a shared "null" bucket.
          for (const session of sessions) {
            const result = limit(`telemetry:session:${session}`, 60, 60_000);
            if (!result.ok) {
              c.header("Retry-After", String(result.retryAfterSec));
              return c.json({ error: "Too many reports" }, 429);
            }
          }
        }

        const events = parsed.data.events.map((event) => sanitizeTelemetryEvent({
          ...event,
          // A browser cannot spoof a trusted server source; it also cannot choose
          // an unrelated UA in its JSON. Internal reports may carry captured UA.
          userAgent: source === "browser"
            ? sanitizeTelemetryText(c.req.header("user-agent") ?? "", 350) || null
            : event.userAgent,
        }));
        try {
          const accepted = await deps.save(events, source);
          c.header("Cache-Control", "no-store");
          return c.json({ accepted });
        } catch {
          return c.json({ error: "Telemetry storage is unavailable" }, 503);
        }
      });
  }
  return { publicRoutes: router("browser"), internalRoutes: router("server") };
}
