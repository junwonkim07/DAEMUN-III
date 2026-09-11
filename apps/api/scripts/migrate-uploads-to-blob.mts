// One-off for the VPS -> Vercel cutover.
//
// Copies every file from a local copy of the VPS upload directory into the
// blob store under the SAME key, then rewrites every `/uploads/<key>` URL
// stored in the database to the store's absolute URL. Rows are the source of
// truth for what is referenced; files nothing references are still copied
// (the orphan sweep can collect them later) so nothing is lost by accident.
//
//   UPLOAD_DRIVER=blob BLOB_READ_WRITE_TOKEN=… DATABASE_URL=… \
//     pnpm exec tsx scripts/migrate-uploads-to-blob.mts <uploads-dir> [--dry-run]
//
// Idempotent: files already in the store are not re-uploaded (their existing
// URL is used), and rows already holding an absolute URL are not touched, so
// it is safe to run again after a partial failure.
import fs from "node:fs/promises";
import path from "node:path";
import { like, sql } from "drizzle-orm";
import { committees, documents, people, resolutions, topics } from "@daemun/db";
import { uploadTypeOf } from "@daemun/shared";
import { db } from "../src/db";
import { storage } from "../src/lib/storage";

const [, , dir, ...flags] = process.argv;
const dryRun = flags.includes("--dry-run");
if (!dir) {
  console.error("usage: migrate-uploads-to-blob.mts <uploads-dir> [--dry-run]");
  process.exit(2);
}
if (storage.name !== "blob") {
  console.error(`UPLOAD_DRIVER must be "blob" (got "${storage.name}")`);
  process.exit(2);
}
const LEGACY = /^\/uploads\/([^/]+)$/;

/* -- 1. files -> store ----------------------------------------------------- */
const inStore = new Map((await storage.list()).map((o) => [o.key, o.url]));
const files = (await fs.readdir(dir, { withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => e.name);

const urlOf = new Map<string, string>();
let uploaded = 0;
let reused = 0;
let unsupported = 0;
for (const name of files) {
  const type = uploadTypeOf(name);
  if (!type) {
    unsupported++;
    console.warn(`  skip  ${name} (unsupported type)`);
    continue;
  }
  const existing = inStore.get(name);
  if (existing) {
    urlOf.set(name, existing);
    reused++;
    continue;
  }
  if (dryRun) {
    console.log(`  would upload  ${name}`);
    urlOf.set(name, `(dry-run) ${name}`);
    continue;
  }
  const body = await fs.readFile(path.join(dir, name));
  const { url } = await storage.put(name, body, type.mime);
  urlOf.set(name, url);
  uploaded++;
}
console.log(
  `files: ${files.length} total, ${uploaded} uploaded, ${reused} already in store, ${unsupported} unsupported`,
);

/* -- 2. rows: /uploads/<key> -> absolute URL -------------------------------- */
const COLUMNS = [
  { label: "committees.image", table: committees, column: committees.image },
  { label: "topics.report", table: topics, column: topics.report },
  { label: "resolutions.document", table: resolutions, column: resolutions.document },
  { label: "people.photo", table: people, column: people.photo },
  { label: "documents.file", table: documents, column: documents.file },
] as const;

let rewritten = 0;
let missing = 0;
for (const { label, table, column } of COLUMNS) {
  const rows = await db
    .select({ id: table.id, url: column })
    .from(table)
    .where(like(column, "/uploads/%"));
  for (const row of rows) {
    const key = LEGACY.exec(row.url ?? "")?.[1];
    const to = key ? urlOf.get(key) : undefined;
    if (!to) {
      missing++;
      console.warn(`  MISSING  ${label} ${row.id}: ${row.url} has no file in ${dir}`);
      continue;
    }
    if (dryRun) {
      console.log(`  would rewrite  ${label} ${row.id}: ${row.url} -> ${to}`);
    } else {
      // The column object renders qualified ("committees"."image"), and
      // Postgres refuses a qualified SET target — so name the column bare.
      await db.execute(
        sql`update ${table} set ${sql.identifier(column.name)} = ${to} where ${table.id} = ${row.id}`,
      );
    }
    rewritten++;
  }
}
console.log(`rows: ${rewritten} rewritten${dryRun ? " (dry-run)" : ""}, ${missing} missing files`);

await db.$client.end();
process.exit(missing > 0 ? 1 : 0);
