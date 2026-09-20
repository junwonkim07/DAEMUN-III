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

export function uploadTypeOf(
  filename: string,
): { kind: string; mime: string } | undefined {
  return UPLOAD_TYPES[extensionOf(filename)];
}

/**
 * A stored file's URL is served `Content-Disposition: inline` by default
 * (Vercel Blob's plain `url`, or the local driver's `/uploads/<key>`). PDFs
 * and images render fine that way, but a browser can't render `.doc`/`.docx`
 * inline — clicking the link just navigates to it, and on Windows/Edge that
 * gets silently bounced through Microsoft's Office Online Viewer
 * (view.officeapps.live.com) to attempt a preview. That viewer is unreliable
 * for anything outside SharePoint/OneDrive and often just fails to open the
 * file — which is the bug this works around.
 *
 * Appending `download=1` (the same param Vercel's own `getDownloadUrl()`
 * uses) makes the store send `Content-Disposition: attachment` instead, so
 * the browser downloads the file directly and never tries to preview it. PDFs
 * and images are left alone since inline viewing works fine for them.
 */
export function fileHref(url: string): string {
  if (extensionOf(url) !== ".doc" && extensionOf(url) !== ".docx") return url;
  return url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
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
  /** "direct" -> upload straight to storage from the browser; "proxy" -> POST through the API. */
  mode: "direct" | "proxy";
  maxBytes: number;
  /** The server's allow-list. The client checks against it so the list can be tightened without a frontend deploy. */
  extensions: string[];
};
