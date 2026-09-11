import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb, type Db } from "./index";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Apply every pending SQL migration in packages/db/drizzle. */
export async function runMigrations(db: Db) {
  await migrate(db, { migrationsFolder: path.resolve(here, "../drizzle") });
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  // DDL wants the direct endpoint of a managed Postgres, while the app's
  // DATABASE_URL points at the pooler. Unset -> same URL as the app.
  const db = createDb(process.env.MIGRATE_DATABASE_URL);
  runMigrations(db)
    .then(() => {
      console.log("✔ migrations applied");
      return db.$client.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
