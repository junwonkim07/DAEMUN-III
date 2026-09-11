/**
 * Where uploaded files live.
 *
 * The API used to write straight to a directory on the host with `node:fs`,
 * which only works while there is exactly one long-lived process sitting on a
 * persistent disk. This interface is the seam that lets a second driver (object
 * storage) drop in without every caller learning about it.
 *
 * A *key* is the opaque storage-side name of an object (`<uuid>.pdf`). A *url*
 * is what the frontends put in `<img src>` / `<a href>` and what gets persisted
 * into DB columns. Only the driver knows how to convert between them.
 */
export type StoredObject = {
  key: string;
  /** The URL callers persist for this object — what put() returned when it was written. */
  url: string;
  size: number;
  /** Epoch millis the object was written; used by the orphan sweep's grace period. */
  uploadedAt: number;
};

export interface StorageDriver {
  /** Short name for logs and diagnostics ("local", "blob"). */
  readonly name: string;

  /** Write `body` under `key` and return the URL callers should persist. */
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;

  /** Every object currently stored. Used by the orphan sweep. */
  list(): Promise<StoredObject[]>;

  /** Delete objects by key. Missing keys are ignored. */
  remove(keys: string[]): Promise<void>;

  /**
   * Map a URL previously produced by `put()` back to its key, or null when the
   * URL did not come from this driver. The sweep uses this to work out which
   * stored objects are still referenced by a DB row.
   */
  keyOf(url: string): string | null;
}
