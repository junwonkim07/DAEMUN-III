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
import { mkdirSync, writeFileSync } from "node:fs";

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
// directory (vercel.json outputDirectory) and rejects an empty one. Static
// files are served ahead of the rewrite, so a real public/ checked into the
// repo was reaching visitors without passing through Hono and its security
// headers. Instead the directory exists only after the build and holds one
// file: a robots.txt that keeps crawlers off an origin serving nothing but
// JSON — the one path that is meant to bypass Hono.
mkdirSync("dist/public", { recursive: true });
writeFileSync("dist/public/robots.txt", "User-agent: *\nDisallow: /\n");
