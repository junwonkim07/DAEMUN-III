// apps/api/src/lib/file-store.ts
//
// Shared by the admin uploads route and the delegate resolution-upload
// route — both just need "take a multipart File, put it under UPLOAD_DIR,
// hand back a /uploads/* URL".
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../env";

const ALLOWED: Record<string, string> = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".pdf": "PDF",
  ".doc": "DOC",
  ".docx": "DOC",
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

/** Validates, writes to UPLOAD_DIR under a random name, and reports back. */
export async function saveUpload(file: File): Promise<SavedFile> {
  const ext = path.extname(file.name).toLowerCase();
  const kind = ALLOWED[ext];
  if (!kind) {
    throw new UploadRejectedError(`Unsupported file type ${ext || "(none)"}`, 415);
  }
  if (file.size > env.maxUploadBytes) {
    throw new UploadRejectedError(`File exceeds ${humanSize(env.maxUploadBytes)}`, 413);
  }

  const name = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(env.uploadDir, name), Buffer.from(await file.arrayBuffer()));

  return {
    url: `/uploads/${name}`,
    originalName: file.name,
    kind,
    bytes: file.size,
    size: humanSize(file.size),
  };
}
