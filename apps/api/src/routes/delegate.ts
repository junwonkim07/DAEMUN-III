// apps/api/src/routes/delegate.ts
//
// §6-1: the delegate-facing half of team resolution submission. Team
// assignment itself is admin-only (PATCH /api/admin/users/:id/team) — this
// only lets a signed-in delegate see their own team and, if they're the
// team's lead, upload the draft.
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { HandleUploadBody } from "@vercel/blob/client";
import { and, eq, ne } from "drizzle-orm";
import { committees, resolutions, resolutionVersions, teams, topics, user } from "@daemun/db";
import { db } from "../db";
import {
  mintUploadToken,
  saveUpload,
  uploadConfig,
  UploadRejectedError,
} from "../lib/file-store";
import { resolutionUploadedMail, sendMail } from "../lib/mail";
import { requireUser, type AuthEnv } from "../middleware/auth";
import { revalidateWeb } from "../lib/revalidate";
import { env } from "../env";
import { storage } from "../lib/storage";

async function myTeamContext(userId: string) {
  const [me] = await db.select().from(user).where(eq(user.id, userId));
  if (!me?.teamId) return null;

  const [team] = await db.select().from(teams).where(eq(teams.id, me.teamId));
  if (!team) return null;

  return { me, team };
}

/**
 * Creates the resolution on first upload or swaps the file on a re-upload,
 * appends the upload to `resolution_versions`, and emails the rest of the
 * team (best-effort — a mail failure must not fail the upload itself).
 */
async function finalizeUpload(
  ctx: NonNullable<Awaited<ReturnType<typeof myTeamContext>>>,
  url: string,
) {
  const [existing] = await db.select().from(resolutions).where(eq(resolutions.teamId, ctx.team.id));

  const row = existing
    ? (
        await db
          .update(resolutions)
          .set({ document: url })
          .where(eq(resolutions.id, existing.id))
          .returning()
      )[0]!
    : (
        await db
          .insert(resolutions)
          .values({
            id: randomUUID(),
            committeeId: ctx.team.committeeId,
            topicId: ctx.team.topicId,
            teamId: ctx.team.id,
            label: ctx.team.name || "Draft resolution",
            submitter: ctx.me.name,
            status: "review",
            document: url,
          })
          .returning()
      )[0]!;

  await db.insert(resolutionVersions).values({
    id: randomUUID(),
    resolutionId: row.id,
    document: url,
  });

  const members = await db
    .select({ email: user.email })
    .from(user)
    .where(and(eq(user.teamId, ctx.team.id), ne(user.id, ctx.me.id)));
  await Promise.all(
    members.map((m) =>
      sendMail(resolutionUploadedMail(m.email, ctx.team.name, `${env.webUrl}/account`)).catch(
        (err) => console.error("[delegate] failed to notify team member of upload", err),
      ),
    ),
  );

  revalidateWeb();
  return { row, created: !existing };
}

export const delegateRoutes = new Hono<AuthEnv>()
  .use("*", requireUser)

  /** My team, its committee/topic, and our resolution draft (if any). */
  .get("/team", async (c) => {
    const ctx = await myTeamContext(c.get("session").user.id);
    if (!ctx) return c.json({ team: null });

    const [[committee], [topic], [resolution]] = await Promise.all([
      db.select().from(committees).where(eq(committees.id, ctx.team.committeeId)),
      db.select().from(topics).where(eq(topics.id, ctx.team.topicId)),
      db.select().from(resolutions).where(eq(resolutions.teamId, ctx.team.id)),
    ]);

    return c.json({
      team: {
        id: ctx.team.id,
        name: ctx.team.name,
        isLead: ctx.me.teamRole === "lead",
        committee: committee ? { slug: committee.slug, code: committee.code, name: committee.name } : null,
        topic: topic ? { id: topic.id, title: topic.title } : null,
      },
      resolution: resolution ?? null,
    });
  })

  /** Same shape as `GET /api/admin/uploads/config` — lets the web app pick proxy vs. direct upload. */
  .get("/resolutions/config", (c) => c.json(uploadConfig()))

  /**
   * Mints a direct-to-storage upload token, mirroring
   * `POST /api/admin/uploads/token` — see `mintUploadToken` in
   * lib/file-store.ts for why this exists. Lead-only, same as the upload
   * itself.
   */
  .post("/resolutions/token", async (c) => {
    const ctx = await myTeamContext(c.get("session").user.id);
    if (!ctx) return c.json({ error: "You are not assigned to a team yet" }, 403);
    if (ctx.me.teamRole !== "lead") {
      return c.json({ error: "Only your team's lead can upload the draft" }, 403);
    }
    if (storage.name === "local") {
      return c.json({ error: "This server stores uploads locally; POST the file instead." }, 409);
    }
    try {
      const body = (await c.req.json()) as HandleUploadBody;
      const json = await mintUploadToken(body, c.req.raw);
      return c.json(json);
    } catch (err) {
      if (err instanceof UploadRejectedError) return c.json({ error: err.message }, err.status);
      if (err instanceof SyntaxError) return c.json({ error: "Malformed request body" }, 400);
      throw err;
    }
  })

  /**
   * Upload or replace my team's draft. Lead-only for v1 (handover.md §6-1
   * decision D — team co-editing is a fast-follow, but see the versioning
   * note below). The first upload creates the resolution row with status
   * "review"; a later re-upload just swaps the file and leaves status where
   * the admin left it. Every upload is recorded in `resolution_versions`
   * and emails the rest of the team.
   *
   * Two ways in, matching `POST /api/admin/uploads`:
   *  - multipart `file` — streamed through this function. Only works on a
   *    host that can take a ~25 MB body (local disk storage).
   *  - JSON `{ url }` — the browser already PUT the file straight into
   *    object storage using a token from `/resolutions/token` and just needs
   *    the row written; this is the path Vercel (and its ~4.5 MB function
   *    body cap) requires.
   */
  .post("/resolutions", async (c) => {
    const ctx = await myTeamContext(c.get("session").user.id);
    if (!ctx) return c.json({ error: "You are not assigned to a team yet" }, 403);
    if (ctx.me.teamRole !== "lead") {
      return c.json({ error: "Only your team's lead can upload the draft" }, 403);
    }

    let url: string;
    if ((c.req.header("content-type") ?? "").includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) {
        return c.json({ error: "Expected a multipart `file` field" }, 400);
      }
      try {
        url = (await saveUpload(file)).url;
      } catch (err) {
        if (err instanceof UploadRejectedError) return c.json({ error: err.message }, err.status);
        throw err;
      }
    } else {
      const body = await c.req.json<{ url?: string }>().catch(() => null);
      // Only a URL minted by this store may be finalized. Without this check a
      // team lead could record an arbitrary external (or javascript:) href as
      // the team's draft, which admins then open as a link.
      if (!body?.url || typeof body.url !== "string" || !storage.keyOf(body.url)) {
        return c.json({ error: "Expected a JSON `url` field pointing at this upload store" }, 400);
      }
      url = body.url;
    }

    const { row, created } = await finalizeUpload(ctx, url);
    return c.json(row, created ? 201 : 200);
  });
