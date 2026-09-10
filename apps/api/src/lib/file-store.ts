// apps/api/src/lib/file-store.ts
//
// Shared by the admin uploads route and the delegate resolution-upload
// route — both just need "take a multipart File, store it, hand back a URL".
//
// Where the bytes land is the storage driver's business (lib/storage); the
// rules about *what* may be stored live in @daemun/shared so the browser can
// enforce the same ones when it uploads directly (see routes/uploads.ts).
import { randomUUID } from "node:crypto";
import { extensionOf, humanSize, uploadTypeOf, type SavedFile } from "@daemun/shared";
import { env } from "../env";
import { storage } from "./storage";

export { humanSize };
export type { SavedFile };

export class UploadRejectedError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

/**
 * Throws unless `filename`/`size` satisfy the upload rules. The direct-upload
 * token route enforces the same list from @daemun/shared, so a browser cannot
 * widen the rules by going around the API.
 */
function assertUploadAllowed(filename: string, size: number) {
  const type = uploadTypeOf(filename);
  if (!type) {
    throw new UploadRejectedError(
      `Unsupported file type ${extensionOf(filename) || "(none)"}`,
      415,
    );
  }
  if (size > env.maxUploadBytes) {
    throw new UploadRejectedError(`File exceeds ${humanSize(env.maxUploadBytes)}`, 413);
  }
  return type;
}

/** A storage key that keeps the original extension but not the original name. */
function keyFor(filename: string) {
  return `${randomUUID()}${extensionOf(filename)}`;
}

/** Validates, stores under a random name, and reports back. */
export async function saveUpload(file: File): Promise<SavedFile> {
  const type = assertUploadAllowed(file.name, file.size);
  const { url } = await storage.put(
    keyFor(file.name),
    Buffer.from(await file.arrayBuffer()),
    type.mime,
  );

  return {
    url,
    originalName: file.name,
    kind: type.kind,
    bytes: file.size,
    size: humanSize(file.size),
  };
}
