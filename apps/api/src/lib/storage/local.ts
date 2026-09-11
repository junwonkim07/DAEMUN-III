/**
 * Files on the API server's own disk, served back by the `/uploads/*` route in
 * app.ts. This is what the VPS deployment has always done, kept byte-for-byte
 * compatible: same `<uuid><ext>` filenames, same `/uploads/<name>` URLs, so
 * rows already in the database keep resolving.
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
