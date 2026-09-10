// apps/api/src/lib/file-store.ts
//
// Shared by the admin uploads route and the delegate resolution-upload
// route — both just need "take a multipart File, store it, hand back a URL".
//
// Where the bytes actually land is the storage driver's business (lib/storage);
// validation and naming stay here so every entry point enforces the same rules.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { env } from "../env";
import { storage } from "./storage";

const ALLOWED: Record<string, { kind: string; mime: string }> = {
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

export function humanSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class UploadRejectedError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

export type SavedFile = {
  url: string;
  originalName: string;
  kind: string;
  bytes: number;
  size: string;
};

/** Validates, stores under a random name, and reports back. */
export async function saveUpload(file: File): Promise<SavedFile> {
  const ext = path.extname(file.name).toLowerCase();
  const allowed = ALLOWED[ext];
  if (!allowed) {
    throw new UploadRejectedError(`Unsupported file type ${ext || "(none)"}`, 415);
  }
  if (file.size > env.maxUploadBytes) {
    throw new UploadRejectedError(`File exceeds ${humanSize(env.maxUploadBytes)}`, 413);
  }

  const key = `${randomUUID()}${ext}`;
  const { url } = await storage.put(
    key,
    Buffer.from(await file.arrayBuffer()),
    allowed.mime,
  );

  return {
    url,
    originalName: file.name,
    kind: allowed.kind,
    bytes: file.size,
    size: humanSize(file.size),
  };
}
