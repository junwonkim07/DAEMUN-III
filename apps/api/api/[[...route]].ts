/**
 * Serverless entrypoint. Vercel turns this file into one function that
 * receives every request under /api/*, and `handle` adapts the Hono app to
 * it. Nothing here is Vercel-specific beyond the adapter; src/index.ts stays
 * the entrypoint for a long-lived Node process (local dev, the VPS).
 *
 * What deliberately does NOT happen here, compared with src/index.ts:
 *
 * - bootstrap() is not called. It applies migrations, seeds an empty
 *   database and creates the first admin — once-per-boot work that a
 *   serverless runtime would repeat on every cold start, concurrently across
 *   instances. Migrations run from the deploy workflow instead
 *   (`pnpm --filter @daemun/db migrate` against the production database);
 *   seeding and the first admin are one-off scripts for a fresh install.
 *
 * - /health is not reachable: only /api/* routes to this function. The
 *   Docker health check that used it does not exist on this host.
 *
 * - /uploads/* is not reachable either. This deployment uses object storage
 *   (UPLOAD_DRIVER=blob), where every persisted URL is absolute.
 */
import { handle } from "hono/vercel";
import { app } from "../src/app";

export default handle(app);
