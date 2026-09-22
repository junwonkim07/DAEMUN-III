/**
 * Files on the API server's own disk, served back by the `/uploads/*` route in
 * app.ts. The default driver, and the only one that works without object
 * storage — local development, or a self-hosted long-lived process with a
 * persistent volume. It is byte-for-byte what the old VPS deployment wrote:
 * same `<uuid><ext>` filenames, same `/uploads/<name>` URLs, so rows written
 * back then keep resolving. Vercel's filesystem is ephemeral and per-instance,
 * so the hosted deployment sets UPLOAD_DRIVER=blob instead.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../env";
import type { StorageDriver, StoredObject } from "./types";

export const localDriver: StorageDriver = {
  name: "local",

  async put(key, body) {
    await fs.mkdir(env.uploadDir, { recursive: true });
    await fs.writeFile(path.join(env.uploadDir, key), body);
    return { url: `/uploads/${key}` };
  },

  async list() {
    let entries;
    try {
      entries = await fs.readdir(env.uploadDir, { withFileTypes: true });
    } catch (err) {
      // Nothing uploaded yet on a fresh install — an empty store, not an error.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }

    const out: StoredObject[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const stat = await fs.stat(path.join(env.uploadDir, entry.name));
      out.push({
        key: entry.name,
        url: `/uploads/${entry.name}`,
        size: stat.size,
        uploadedAt: stat.mtimeMs,
      });
    }
    return out;
  },

  async remove(keys) {
    for (const key of keys) {
      await fs.rm(path.join(env.uploadDir, key), { force: true });
    }
  },

  keyOf(url) {
    const m = /^\/uploads\/([^/]+)$/.exec(url);
    return m ? m[1]! : null;
  },
};
