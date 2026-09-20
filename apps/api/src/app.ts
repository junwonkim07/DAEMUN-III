import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { auth } from "./auth";
import { env } from "./env";
import { storage } from "./lib/storage";
import { adminRoutes } from "./routes/admin";
import { delegateRoutes } from "./routes/delegate";
import { publicRoutes } from "./routes/public";
import { createTelemetryRoutes } from "./routes/telemetry";
import { storeTelemetry } from "./lib/telemetry-store";
import { telemetryOrigins } from "./lib/telemetry-origins";
import { apiErrorReport, persistApiError } from "./lib/telemetry-error";

const telemetry = createTelemetryRoutes({
  origins: telemetryOrigins(
    [env.webUrl, env.webPublicUrl, env.adminUrl], env.telemetryAllowedOrigins, env.isProd,
  ),
  secret: env.telemetryIngestSecret,
  save: storeTelemetry,
});

/**
 * Route map
 *
 *   GET  /health                      liveness
 *   GET  /uploads/*                   files stored by the admin
 *   *    /api/auth/*                  better-auth (sign-in, session, admin users…)
 *   GET  /api/public/site             full SiteData payload for the public site
 *   *    /api/admin/*                 authenticated content CRUD (see routes/admin.ts)
 *   *    /api/delegate/*               a delegate's own team + resolution upload (routes/delegate.ts)
 *
 * No CORS is configured on purpose: frontends proxy `/api/*` and `/uploads/*`
 * to this server through Next.js rewrites, so every browser request is
 * same-origin. Set CORS_ORIGIN if a client ever needs to call directly.
 */
export const app = new Hono()
  .use("*", logger())
  .use("*", secureHeaders())

  .get("/health", (c) => c.json({ ok: true, uptime: process.uptime() }))

  // Only the local driver keeps files on this server's disk. With object
  // storage every persisted URL is absolute, so nothing legitimately asks
  // this server for /uploads/* — a request here is a row not yet migrated,
  // and 404 is the honest answer rather than reading a directory that
  // does not exist.
  .use(
    "/uploads/*",
    storage.name === "local"
      ? serveStatic({
          root: env.uploadDir,
          rewriteRequestPath: (p) => p.replace(/^\/uploads/, ""),
        })
      : (_c, next) => next(),
  )

  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))

  .route("/api/public", publicRoutes)
  .route("/api/public/telemetry", telemetry.publicRoutes)
  .route("/api/internal/telemetry", telemetry.internalRoutes)
  .route("/api/admin", adminRoutes)
  .route("/api/delegate", delegateRoutes)

  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError(async (err, c) => {
    const report = apiErrorReport(err, {
      path: c.req.path,
      userAgent: c.req.header("user-agent"),
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_RELEASE,
    });
    console.error("[api] request failed", report.details.errorType, report.details.message);
    await persistApiError(report, storeTelemetry);
    return c.json(
      { error: env.isProd ? "Internal server error" : err.message },
      500,
    );
  });

export type AppType = typeof app;
