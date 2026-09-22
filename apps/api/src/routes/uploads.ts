import { Hono } from "hono";
import type { HandleUploadBody } from "@vercel/blob/client";
import { mintUploadToken, saveUpload, uploadConfig, UploadRejectedError } from "../lib/file-store";
import { storage } from "../lib/storage";
import { sweepOrphanUploads } from "../lib/uploads-gc";

export const uploadRoutes = new Hono()
  /**
   * `GET /api/admin/uploads/config` — tells the browser whether it may upload
   * straight to storage and what this server will accept. The limits are the
   * server's, not a copy kept in the frontend.
   */
  .get("/config", (c) => c.json(uploadConfig()))

  /**
   * `POST /api/admin/uploads/token` — mints a short-lived token the browser
   * uses to PUT the file straight into the store, skipping this server. See
   * `mintUploadToken` in lib/file-store.ts for why this detour exists.
   */
  .post("/token", async (c) => {
    if (storage.name === "local") {
      return c.json({ error: "This server stores uploads locally; POST the file instead." }, 409);
    }
    try {
      const body = (await c.req.json()) as HandleUploadBody;
      const json = await mintUploadToken(body, c.req.raw);
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
