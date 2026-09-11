import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function databaseUrl() {
  return (
    process.env.DATABASE_URL ?? "postgres://daemun:daemun@localhost:5432/daemun"
  );
}

/**
 * A positive integer from the environment, or `fallback` — loudly — when the
 * variable is unset or nonsense. `Number("abc")` is NaN and `Number("0")` is
 * 0, and handing either to pg quietly disables the very limit it was meant
 * to set.
 */
function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  console.warn(`[db] ${name}=${JSON.stringify(raw)} is not a positive integer; using ${fallback}`);
  return fallback;
}

export function createDb(connectionString = databaseUrl()) {
  const pool = new Pool({
    connectionString,
    // One long-lived process can hold pg's default of 10 idle connections
    // without anyone noticing. Many short-lived serverless instances cannot:
    // each would open its own ten against the database, so set DB_POOL_MAX
    // low there (and point DATABASE_URL at a pooled endpoint). Idle
    // connections are also released quickly so a frozen instance is not
    // still holding them.
    max: positiveInt("DB_POOL_MAX", 10),
    idleTimeoutMillis: positiveInt("DB_IDLE_TIMEOUT_MS", 10_000),
  });

  // node-postgres emits 'error' on the pool when an *idle* client's connection
  // drops underneath it — a Postgres restart (every `docker compose up -d` that
  // recreates the db container) or a managed provider suspending an idle
  // compute. With no listener Node treats it as an unhandled 'error' event and
  // kills the process, so a routine db restart takes the whole API down.
  // The pool already discards the dead client and the next query dials a fresh
  // one, so logging is the correct response, not rethrowing.
  pool.on("error", (err) => {
    console.warn("[db] idle client dropped:", err.message);
  });

  return drizzle({ client: pool, schema });
}

export { schema };
export * from "./schema";
