// vercel.json buildCommand for the API project.
//
// A production build applies pending migrations to the production database
// BEFORE the new function is bundled, so the code that goes live never runs
// ahead of the schema. This is the work bootstrap() used to do at boot, moved
// to the one place that runs exactly once per deploy instead of once per cold
// start. (Migrations are additive by convention — see CLAUDE.md — so the old
// function that is still serving during the build keeps working too.)
//
// Preview deploys skip the migration: a feature branch's migration must never
// touch the production database, and previews share it.
//
// Migrations go through MIGRATE_DATABASE_URL — the direct, non-pooled
// endpoint. Runtime traffic uses DATABASE_URL (pooled); DDL through a
// transaction-mode pooler is not something to depend on.
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

function run(cmd) {
  console.log(`[vercel-build] ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

const env = process.env.VERCEL_ENV ?? "(unset)";
if (env === "production") {
  if (!process.env.MIGRATE_DATABASE_URL) {
    throw new Error(
      "MIGRATE_DATABASE_URL (the direct, non-pooled endpoint) must be set for production builds",
    );
  }
  run("pnpm --filter @daemun/db migrate");
} else {
  console.log(`[vercel-build] VERCEL_ENV=${env} — skipping migrations`);
}

run("pnpm bundle");

// The "Other" preset refuses to finish a deploy without a static output
// directory (vercel.json outputDirectory). Give it an empty one that only
// exists after the build: a real public/ checked into the repo was served
// ahead of the rewrite, bypassing Hono and its security headers.
mkdirSync("dist/public", { recursive: true });
