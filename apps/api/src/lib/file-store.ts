// apps/api/src/lib/file-store.ts
//
// Shared by the admin uploads route and the delegate resolution-upload
// route — both just need "take a multipart File, store it, hand back a URL".
//
// Where the bytes land is the storage driver's business (lib/storage); the
// rules about *what* may be stored live in @daemun/shared so the browser can
// enforce the same ones when it uploads directly (see routes/uploads.ts).
import { randomUUID } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  extensionOf,
  humanSize,
  uploadTypeOf,
  UPLOAD_EXTENSIONS,
  type SavedFile,
  type UploadConfig,
} from "@daemun/shared";
import { env } from "../env";
import { storage } from "./storage";

export { humanSize };
export type { SavedFile };

/** Tells a browser whether it may upload straight to storage and what this server accepts. */
export function uploadConfig(): UploadConfig {
  return {
    mode: storage.name === "local" ? "proxy" : "direct",
    maxBytes: env.maxUploadBytes,
    extensions: UPLOAD_EXTENSIONS,
  };
}

export class UploadRejectedError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

/**
 * A direct-upload pathname the browser proposed. It must look like the keys
 * we mint ourselves (`<uuid><ext>`) — the client picks the name, so without
 * this it could overwrite an unrelated object or plant a path outside the
 * store's flat namespace.
 */
const UPLOAD_KEY_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;

/**
 * Shared by every direct-upload token route (admin uploads, delegate
 * resolutions) — mints a short-lived token the browser uses to PUT a file
 * straight into the store, skipping this server. That detour exists because
 * a serverless function caps its request body around 4.5 MB while
 * MAX_UPLOAD_MB is 25: a resolution PDF cannot fit through the function at
 * all. The rules still hold — they move into the token, and the store
 * enforces `maximumSizeInBytes` itself, so a client that lies about the size
 * still gets rejected.
 */
export async function mintUploadToken(body: HandleUploadBody, request: Request) {
  if (body?.type !== "blob.generate-client-token") {
    throw new UploadRejectedError("Unexpected event type", 400);
  }
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!UPLOAD_KEY_SHAPE.test(pathname)) {
        throw new UploadRejectedError("Malformed upload key", 400);
      }
      const type = uploadTypeOf(pathname);
      if (!type) throw new UploadRejectedError("Unsupported file type", 415);
      return {
        allowedContentTypes: [type.mime],
        maximumSizeInBytes: env.maxUploadBytes,
        addRandomSuffix: false,
        // The client picks the key, so state outright that an existing
        // object must never be replaced rather than lean on the API default.
        allowOverwrite: false,
      };
    },
    // Deliberately no onUploadCompleted. With it absent the SDK embeds no
    // callback URL in the token, so nothing later tries to call back without
    // a session. The browser hands the URL to the mutation that writes the
    // row; an object no row ever references is collected by /gc.
  });
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
