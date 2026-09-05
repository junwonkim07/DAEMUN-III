// apps/api/src/routes/delegate.ts
//
// §6-1: the delegate-facing half of team resolution submission. Team
// assignment itself is admin-only (PATCH /api/admin/users/:id/team) — this
// only lets a signed-in delegate see their own team and, if they're the
// team's lead, upload the draft.
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { committees, resolutions, teams, topics, user } from "@daemun/db";
import { db } from "../db";
import { saveUpload, UploadRejectedError } from "../lib/file-store";
import { requireUser, type AuthEnv } from "../middleware/auth";
import { revalidateWeb } from "../lib/revalidate";

async function myTeamContext(userId: string) {
  const [me] = await db.select().from(user).where(eq(user.id, userId));
  if (!me?.teamId) return null;

  const [team] = await db.select().from(teams).where(eq(teams.id, me.teamId));
  if (!team) return null;

  return { me, team };
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

  /**
   * Upload or replace my team's draft. Lead-only for v1 (handover.md §6-1
   * decision D — team co-editing is a fast-follow). The first upload
   * creates the resolution row with status "review"; a later re-upload
   * just swaps the file and leaves status where the admin left it.
   */
  .post("/resolutions", async (c) => {
    const ctx = await myTeamContext(c.get("session").user.id);
    if (!ctx) return c.json({ error: "You are not assigned to a team yet" }, 403);
    if (ctx.me.teamRole !== "lead") {
      return c.json({ error: "Only your team's lead can upload the draft" }, 403);
    }

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "Expected a multipart `file` field" }, 400);
    }

    let saved;
    try {
      saved = await saveUpload(file);
    } catch (err) {
      if (err instanceof UploadRejectedError) return c.json({ error: err.message }, err.status);
      throw err;
    }

    const [existing] = await db.select().from(resolutions).where(eq(resolutions.teamId, ctx.team.id));

    const row = existing
      ? (
          await db
            .update(resolutions)
            .set({ document: saved.url })
            .where(eq(resolutions.id, existing.id))
            .returning()
        )[0]
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
              document: saved.url,
            })
            .returning()
        )[0];

    revalidateWeb();
    return c.json(row, existing ? 200 : 201);
  });
