import fs from "node:fs/promises";
import { count } from "drizzle-orm";
import { user } from "@daemun/db";
import { runMigrations } from "@daemun/db/migrate";
import { seedIfEmpty } from "@daemun/db/seed";
import { auth } from "./auth";
import { db } from "./db";
import { env } from "./env";

/**
 * Everything the API needs before it can serve traffic:
 *  1. apply pending migrations
 *  2. seed default content into an empty database
 *  3. create the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD
 *  4. make sure the upload directory exists
 *
 * All steps are idempotent, so this runs on every start.
 *
 * Only a long-lived process calls it (src/index.ts — local dev, or any
 * self-hosted `pnpm start`). The serverless entry deliberately does not: see
 * api/index.mjs. There, migrations run in the build step and the first admin
 * is created by an existing admin.
 */
export async function bootstrap() {
  await runMigrations(db);
  console.log("[bootstrap] migrations up to date");

  if (await seedIfEmpty(db)) console.log("[bootstrap] seeded default content");

  const [{ users }] = await db.select({ users: count() }).from(user);
  if (users === 0) {
    if (env.bootstrapAdminEmail && env.bootstrapAdminPassword) {
      await auth.api.createUser({
        body: {
          email: env.bootstrapAdminEmail,
          password: env.bootstrapAdminPassword,
          name: env.bootstrapAdminName,
          role: "admin",
        },
      });
      console.log(`[bootstrap] created admin ${env.bootstrapAdminEmail}`);
    } else {
      console.warn(
        "[bootstrap] no users exist and ADMIN_EMAIL / ADMIN_PASSWORD are unset — admin routes are unreachable",
      );
    }
  }

  await fs.mkdir(env.uploadDir, { recursive: true });
}
