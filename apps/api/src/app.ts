import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { auth } from "./auth";
import { env } from "./env";
import { adminRoutes } from "./routes/admin";
import { delegateRoutes } from "./routes/delegate";
import { publicRoutes } from "./routes/public";

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

  .use(
    "/uploads/*",
    serveStatic({
      root: env.uploadDir,
      rewriteRequestPath: (p) => p.replace(/^\/uploads/, ""),
    }),
  )

  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))

  .route("/api/public", publicRoutes)
  .route("/api/admin", adminRoutes)
  .route("/api/delegate", delegateRoutes)

  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError((err, c) => {
    console.error(err);
    return c.json(
      { error: env.isProd ? "Internal server error" : err.message },
      500,
    );
  });

export type AppType = typeof app;
