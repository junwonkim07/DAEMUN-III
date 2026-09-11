/**
 * Serverless entrypoint. Vercel turns this file into one function, and the
 * [...route] catch-all in the filename is what makes every request under
 * /api/* reach it. (The optional form [[...route]] is a Next.js convention;
 * plain Vercel routing takes it literally — the first deploy mounted the
 * function at /api/[[...route]] and 404'd everything else.) src/index.ts
 * stays the entrypoint for a long-lived Node process (local dev, the VPS).
 *
 * Why two lines of .mjs rather than importing the TypeScript app directly:
 *
 * - @vercel/node transpiles .ts files one at a time and never rewrites import
 *   specifiers. The app uses extensionless relative imports and workspace
 *   packages whose exports point at .ts source — fine under tsx and Next, but
 *   as native ESM on Vercel every one of them is ERR_MODULE_NOT_FOUND. So the
 *   build step (`pnpm bundle`, see vercel.json) rolls the whole app into
 *   dist/app.mjs with esbuild, and this file imports that with an explicit
 *   extension.
 *
 * - The export is the Hono app object, not hono/vercel's handle(). Vercel's
 *   Node runtime detects an object with a `fetch` method and adapts it,
 *   handing it a Request built from the original path so the /api-prefixed
 *   routes match. handle() returns a bare (Request) => Response function,
 *   which the runtime would call as a (req, res) Node handler — the Response
 *   it returned would go nowhere and the request would hang.
 *
 * - It is .mjs so neither @vercel/node nor tsc processes it. There is nothing
 *   to typecheck here; src/ is covered by `pnpm typecheck`, and
 *   `"framework": null` in vercel.json keeps Vercel from also auto-building
 *   src/index.ts as a second function.
 *
 * - ../public/ is empty and exists only because the "Other" preset refuses to
 *   finish a deploy without a static output directory. Nothing is served
 *   from it.
 *
 * What deliberately does NOT happen here, compared with src/index.ts:
 *
 * - bootstrap() is not called. It applies migrations, seeds an empty database
 *   and creates the first admin — once-per-boot work that a serverless
 *   runtime would repeat on every cold start, concurrently across instances.
 *   Migrations run from the deploy workflow instead
 *   (`pnpm --filter @daemun/db migrate` against the production database).
 *
 * - /health is not reachable: only /api/* routes to this function.
 *
 * - /uploads/* is not reachable either. This deployment uses object storage
 *   (UPLOAD_DRIVER=blob), where every persisted URL is absolute.
 */
import { app } from "../dist/app.mjs";

export default app;
