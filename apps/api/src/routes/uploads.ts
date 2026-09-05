import { Hono } from "hono";
import { saveUpload, UploadRejectedError } from "../lib/file-store";
import { sweepOrphanUploads } from "../lib/uploads-gc";

/**
 * `POST /api/admin/uploads` — multipart with a single `file` field.
 * Stores the file under UPLOAD_DIR and returns a path the frontends can
 * reference directly (they proxy `/uploads/*` to this server).
 */
export const uploadRoutes = new Hono()
  /**
   * `POST /api/admin/uploads/gc` — deletes files under UPLOAD_DIR that no
   * table references anymore (a replaced or removed upload never deletes
   * the old file itself). See lib/uploads-gc.ts.
   */
  .post("/gc", async (c) => c.json(await sweepOrphanUploads()))
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
