/**
 * Vercel Blob — object storage, for deployments with no persistent local disk.
 *
 * Auth comes from BLOB_READ_WRITE_TOKEN, which the SDK reads from the
 * environment on its own; Vercel injects it into every project the store is
 * linked to. Keys are the same `<uuid><ext>` names the local driver uses, so a
 * store can be populated by copying files across without renaming anything.
 */
import { del, list, put } from "@vercel/blob";
import type { StorageDriver, StoredObject } from "./types";

/** `https://<store>.public.blob.vercel-storage.com/<pathname>` */
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

export const blobDriver: StorageDriver = {
  name: "blob",

  async put(key, body, contentType) {
    const res = await put(key, body, {
      access: "public",
      contentType,
      // The key is already a UUID, so the SDK's collision-avoidance suffix
      // would only make the stored pathname disagree with the key we hand to
      // keyOf() and remove().
      addRandomSuffix: false,
    });
    return { url: res.url };
  },

  async list() {
    const out: StoredObject[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ cursor });
      for (const b of page.blobs) {
        out.push({ key: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt.getTime() });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  },

  async remove(keys) {
    if (keys.length) await del(keys);
  },

  keyOf(url) {
    // Rows written since the cutover hold an absolute Blob URL.
    try {
      const parsed = new URL(url);
      if (BLOB_HOST.test(parsed.hostname)) {
        return decodeURIComponent(parsed.pathname.replace(/^\//, "")) || null;
      }
      return null;
    } catch {
      // Not absolute — fall through to the legacy form below.
    }

    // Rows written before the cutover still hold `/uploads/<key>`. The keys did
    // not change when the files were copied into the store, so these must keep
    // resolving: if they did not, the orphan sweep would see a live file as
    // unreferenced and delete it.
    const legacy = /^\/uploads\/([^/]+)$/.exec(url);
    return legacy ? legacy[1]! : null;
  },
};
