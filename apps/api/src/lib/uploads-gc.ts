// apps/api/src/lib/uploads-gc.ts
//
// Replacing or removing a file in the admin UI (committee image, topic
// report, resolution document, person photo, document file) only ever
// rewrites the DB column — the old object stays in storage forever. This
// sweeps orphans away on demand.
import { isNotNull } from "drizzle-orm";
import { committees, documents, people, resolutions, resolutionVersions, topics } from "@daemun/db";
import { db } from "../db";
import { storage } from "./storage";

/**
 * Minimum age before an unreferenced object is eligible for deletion. Covers
 * the gap between the upload (object lands in storage) and the follow-up
 * `PATCH` that attaches its URL to a row — a sweep mid-gap must not delete
 * an object that's about to be referenced.
 */
const GRACE_MS = 10 * 60 * 1000;

/** Every storage key any table still points to. */
async function referencedKeys(): Promise<Set<string>> {
  const [images, reports, docs, photos, files, versions] = await Promise.all([
    db.select({ url: committees.image }).from(committees).where(isNotNull(committees.image)),
    db.select({ url: topics.report }).from(topics).where(isNotNull(topics.report)),
    db.select({ url: resolutions.document }).from(resolutions).where(isNotNull(resolutions.document)),
    db.select({ url: people.photo }).from(people).where(isNotNull(people.photo)),
    db.select({ url: documents.file }).from(documents),
    // Superseded drafts — no row's `document` column points at these anymore,
    // but they're still on record as history and must survive GC.
    db.select({ url: resolutionVersions.document }).from(resolutionVersions),
  ]);

  const keys = new Set<string>();
  for (const { url } of [...images, ...reports, ...docs, ...photos, ...files, ...versions]) {
    if (!url) continue;
    const key = storage.keyOf(url);
    if (key) keys.add(key);
  }
  return keys;
}

export type UploadsGcReport = { scanned: number; deleted: string[]; freedBytes: number };

/** Deletes stored objects that no table references anymore. */
export async function sweepOrphanUploads(): Promise<UploadsGcReport> {
  const [live, objects] = await Promise.all([referencedKeys(), storage.list()]);

  const now = Date.now();
  const orphans = objects.filter(
    (o) => !live.has(o.key) && now - o.uploadedAt >= GRACE_MS,
  );

  if (orphans.length) await storage.remove(orphans.map((o) => o.key));

  return {
    scanned: objects.length,
    deleted: orphans.map((o) => o.key),
    freedBytes: orphans.reduce((sum, o) => sum + o.size, 0),
  };
}
