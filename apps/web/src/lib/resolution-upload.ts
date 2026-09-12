// apps/web/src/lib/resolution-upload.ts
//
// Mirrors apps/admin/src/lib/api.ts's uploadFile() for the one upload the
// public site does: a team lead's resolution draft. Two paths, picked by
// what the server tells us via /api/delegate/resolutions/config:
//  - "proxy" (local-disk storage): multipart POST straight to
//    /api/delegate/resolutions, same as before.
//  - "direct" (object storage): the browser PUTs the file straight into
//    storage with a token from /api/delegate/resolutions/token, then POSTs
//    the resulting URL to /api/delegate/resolutions to write the row — a
//    serverless function's body cap (~4.5MB) can't fit a 25MB PDF, so the
//    bytes never go through this server's own route in that mode.
import { upload } from "@vercel/blob/client";
import { extensionOf, uploadTypeOf, uuid, type UploadConfig } from "@daemun/shared";

export class ResolutionUploadError extends Error {}

let configPromise: Promise<UploadConfig> | null = null;
function resolutionUploadConfig(): Promise<UploadConfig> {
  configPromise ??= fetch("/api/delegate/resolutions/config")
    .then((res) => {
      if (!res.ok) throw new ResolutionUploadError(`Request failed (${res.status})`);
      return res.json();
    })
    .catch((err) => {
      configPromise = null;
      throw err;
    });
  return configPromise;
}

/** Uploads (or replaces) my team's draft and returns the updated resolution row. */
export async function uploadResolutionDraft(file: File): Promise<unknown> {
  const type = uploadTypeOf(file.name);
  if (!type) {
    throw new ResolutionUploadError(`Unsupported file type ${extensionOf(file.name) || "(none)"}`);
  }

  const config = await resolutionUploadConfig();
  if (!config.extensions.includes(extensionOf(file.name))) {
    throw new ResolutionUploadError(`Unsupported file type ${extensionOf(file.name) || "(none)"}`);
  }
  if (file.size > config.maxBytes) {
    throw new ResolutionUploadError(`File is too large (max ${Math.round(config.maxBytes / 1024 / 1024)}MB).`);
  }

  if (config.mode === "proxy") {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/delegate/resolutions", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new ResolutionUploadError(json.error ?? "Upload failed.");
    return json;
  }

  let blob;
  try {
    blob = await upload(`${uuid()}${extensionOf(file.name)}`, file, {
      access: "public",
      contentType: type.mime,
      handleUploadUrl: "/api/delegate/resolutions/token",
    });
  } catch (err) {
    throw new ResolutionUploadError(err instanceof Error ? err.message : "Upload failed.");
  }

  const res = await fetch("/api/delegate/resolutions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: blob.url }),
  });
  const json = await res.json();
  if (!res.ok) throw new ResolutionUploadError(json.error ?? "Upload failed.");
  return json;
}
