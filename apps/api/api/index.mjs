/**
 * Serverless entrypoint. Vercel turns this file into one function at /api,
 * and the rewrite in vercel.json (`/(.*)` -> `/api`) sends every request to
 * it with the original path intact, so Hono's own routing decides — the same
 * shape as on the VPS. Filename-based routing was tried first and rejected:
 * `[[...route]].mjs` (a Next.js convention) was mounted literally, and
 * `[...route].mjs` matched a single path segment only, so /api/public/site
 * never reached the function. src/index.ts stays the entrypoint for a
 * long-lived Node process (local dev, the VPS).
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
 * - vercel.json points outputDirectory at dist/public, an empty directory
 *   the build creates, because the "Other" preset refuses to finish a deploy
 *   without one. A real public/ in the repo was served ahead of the rewrite
 *   (bypassing Hono and its security headers), so there is none.
 *
 * What deliberately does NOT happen here, compared with src/index.ts:
 *
 * - bootstrap() is not called. It applies migrations, seeds an empty database
 *   and creates the first admin — once-per-boot work that a serverless
 *   runtime would repeat on every cold start, concurrently across instances.
 *   Migrations run in the production build step instead
 *   (scripts/vercel-build.mjs, run by vercel.json's buildCommand).
 *
 * - /health still answers (the rewrite forwards it too), but nothing here
 *   polls it — the Docker health check that used it does not exist on this
 *   host.
 *
 * - /uploads/* answers 404: this deployment uses object storage
 *   (UPLOAD_DRIVER=blob), where every persisted URL is absolute, and app.ts
 *   only mounts the static handler for the local driver.
 */
import { app } from "../dist/app.mjs";

export default app;
