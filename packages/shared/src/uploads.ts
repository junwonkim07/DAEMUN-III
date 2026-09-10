/**
 * Upload rules that both sides of the wire need to agree on.
 *
 * They used to live only in the API, which was fine while every file was
 * POSTed through it. Direct-to-storage uploads hand the browser the job, so
 * the client now has to know the same extension list, size ceiling and
 * label formatting — hence one shared source instead of two drifting copies.
 */

/** Extension -> how the file is labelled in the UI, and what to send as Content-Type. */
export const UPLOAD_TYPES: Record<string, { kind: string; mime: string }> = {
  ".jpg": { kind: "image", mime: "image/jpeg" },
  ".jpeg": { kind: "image", mime: "image/jpeg" },
  ".png": { kind: "image", mime: "image/png" },
  ".webp": { kind: "image", mime: "image/webp" },
  ".pdf": { kind: "PDF", mime: "application/pdf" },
  ".doc": { kind: "DOC", mime: "application/msword" },
  ".docx": {
    kind: "DOC",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

export const UPLOAD_EXTENSIONS = Object.keys(UPLOAD_TYPES);

/** Lowercased extension including the dot, or "" when the name has none. */
export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function uploadTypeOf(filename: string) {
  return UPLOAD_TYPES[extensionOf(filename)];
}

/** "812 KB" / "3.4 MB" — the label stored alongside documents. */
export function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What a stored upload looks like to every caller. */
export type SavedFile = {
  url: string;
  originalName: string;
  kind: string;
  bytes: number;
  size: string;
};

/**
 * Told to the browser by `GET /api/admin/uploads/config` so it knows whether
 * it may upload straight to storage, and what the server will accept.
 */
export type UploadConfig = {
  /** "blob" -> upload directly from the browser; "local" -> POST through the API. */
  mode: "direct" | "proxy";
  maxBytes: number;
  extensions: string[];
};
