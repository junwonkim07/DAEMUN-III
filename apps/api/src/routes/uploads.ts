import { Hono } from "hono";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { UPLOAD_EXTENSIONS, uploadTypeOf, type UploadConfig } from "@daemun/shared";
import { env } from "../env";
import { saveUpload, UploadRejectedError } from "../lib/file-store";
import { storage } from "../lib/storage";
import { sweepOrphanUploads } from "../lib/uploads-gc";

/**
 * A direct-upload pathname the browser proposed. It must look like the keys
 * we mint ourselves (`<uuid><ext>`) — the client picks the name, so without
 * this it could overwrite an unrelated object or plant a path outside the
 * store's flat namespace.
 */
const KEY_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;

export const uploadRoutes = new Hono()
  /**
   * `GET /api/admin/uploads/config` — tells the browser whether it may upload
   * straight to storage and what this server will accept. The limits are the
   * server's, not a copy kept in the frontend.
   */
  .get("/config", (c) =>
    c.json<UploadConfig>({
      mode: storage.name === "local" ? "proxy" : "direct",
      maxBytes: env.maxUploadBytes,
      extensions: UPLOAD_EXTENSIONS,
    }),
  )

  /**
   * `POST /api/admin/uploads/token` — mints a short-lived token the browser
   * uses to PUT the file straight into the store, skipping this server.
   *
   * That detour exists because a serverless function caps its request body at
   * about 4.5 MB while MAX_UPLOAD_MB is 25: a resolution PDF cannot fit through
   * the function at all. The rules still hold — they move into the token, and
   * the store enforces `maximumSizeInBytes` itself, so a client that lies about
   * the size still gets rejected.
   */
  .post("/token", async (c) => {
    if (storage.name === "local") {
      return c.json({ error: "This server stores uploads locally; POST the file instead." }, 409);
    }

    try {
      const body = (await c.req.json()) as HandleUploadBody;
      // Only the token-minting event is ever expected here; the upload-completed
      // event exists for the callback we deliberately do not register below.
      if (body?.type !== "blob.generate-client-token") {
        return c.json({ error: "Unexpected event type" }, 400);
      }
      const json = await handleUpload({
        body,
        request: c.req.raw,
        onBeforeGenerateToken: async (pathname) => {
          if (!KEY_SHAPE.test(pathname)) {
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
        // callback URL in the token, so nothing later tries to call /api/admin
        // back without a session (and nothing warns off-Vercel). The browser
        // hands the URL to the mutation that writes the row; an object no row
        // ever references is collected by /gc.
      });
      return c.json(json);
    } catch (err) {
      if (err instanceof UploadRejectedError) {
        return c.json({ error: err.message }, err.status);
      }
      // A body we could not parse is the client's fault. Anything else — a
      // missing BLOB_READ_WRITE_TOKEN, an upstream failure — is ours, so let
      // app.onError mask it in production the way every other route does.
      if (err instanceof SyntaxError) {
        return c.json({ error: "Malformed request body" }, 400);
      }
      throw err;
    }
  })

  /**
   * `POST /api/admin/uploads/gc` — deletes stored objects that no table
   * references anymore (a replaced or removed upload never deletes the old
   * object itself). See lib/uploads-gc.ts.
   */
  .post("/gc", async (c) => c.json(await sweepOrphanUploads()))

  /**
   * `POST /api/admin/uploads` — multipart with a single `file` field. Used when
   * the server stores uploads on its own disk; hosts that can take a 25 MB body
   * keep working exactly as before.
   */
  .post("/", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "Expected a multipart `file` field" }, 400);
    }

    try {
      return c.json(await saveUpload(file), 201);
    } catch (err) {
      if (err instanceof UploadRejectedError) {
        return c.json({ error: err.message }, err.status);
      }
      throw err;
    }
  });
