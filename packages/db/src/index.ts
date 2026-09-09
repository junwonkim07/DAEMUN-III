import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function databaseUrl() {
  return (
    process.env.DATABASE_URL ?? "postgres://daemun:daemun@localhost:5432/daemun"
  );
}

export function createDb(connectionString = databaseUrl()) {
  const pool = new Pool({ connectionString });

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
