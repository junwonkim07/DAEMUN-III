import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import {
  committeeCreateSchema,
  committeeUpdateSchema,
  conferenceUpdateSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  documentCreateSchema,
  documentUpdateSchema,
  faqCreateSchema,
  faqUpdateSchema,
  personCreateSchema,
  personUpdateSchema,
  resolutionCreateSchema,
  resolutionUpdateSchema,
  scheduleDayCreateSchema,
  scheduleDayUpdateSchema,
  scheduleItemCreateSchema,
  scheduleItemUpdateSchema,
  topicCreateSchema,
  topicUpdateSchema,
} from "@daemun/shared";
import {
  chatLogs,
  committees,
  conference,
  departments,
  documents,
  faqs,
  people,
  resolutions,
  scheduleDays,
  scheduleItems,
  topics,
  user,
} from "@daemun/db";
import { db } from "../db";
import { crudRoutes } from "../lib/crud";
import { onlineCount } from "../lib/presence";
import { revalidateWeb } from "../lib/revalidate";
import { systemStats } from "../lib/system";
import { requireAdmin } from "../middleware/auth";
import { buildSiteData } from "./public";
import { uploadRoutes } from "./uploads";

/**
 * Everything under /api/admin requires an authenticated user with role
 * "admin". Each content table gets the same five routes from crudRoutes():
 *
 *   GET    /            list (ordered)
 *   POST   /            create
 *   PATCH  /:id         partial update
 *   DELETE /:id         delete
 *   PUT    /reorder     { ids: string[] } → rewrites sortOrder
 *
 * Only the singleton conference row and file uploads are hand-written.
 */
export const adminRoutes = new Hono()
  .use("*", requireAdmin)

  /* -- conference (singleton) ---------------------------------------- */
  .get("/conference", async (c) => {
    const [row] = await db.select().from(conference).where(eq(conference.id, "main"));
    return c.json(row ?? null);
  })
  .patch("/conference", zValidator("json", conferenceUpdateSchema), async (c) => {
    const [row] = await db
      .update(conference)
      .set(c.req.valid("json"))
      .where(eq(conference.id, "main"))
      .returning();
    revalidateWeb();
    return c.json(row);
  })

  /* -- preview: exactly what the public site will receive ------------ */
  .get("/site", async (c) => c.json(await buildSiteData()))

  /* -- overview numbers: live visitors, resolution pipeline, accounts, host -- */
  .get("/stats", async (c) => {
    const [byStatus, byRole, system] = await Promise.all([
      db
        .select({ status: resolutions.status, n: count() })
        .from(resolutions)
        .groupBy(resolutions.status),
      db
        .select({ role: sql<string>`coalesce(${user.role}, '')`, n: count() })
        .from(user)
        .groupBy(sql`coalesce(${user.role}, '')`),
      systemStats(),
    ]);
    const statusCounts = { awaiting: 0, review: 0, approved: 0, published: 0 };
    for (const r of byStatus) statusCounts[r.status] = Number(r.n);
    const roleCounts: Record<string, number> = {};
    for (const r of byRole) roleCounts[r.role] = Number(r.n);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    return c.json({
      online: onlineCount(),
      resolutions: { ...statusCounts, total: sum(statusCounts) },
      accounts: {
        participants: roleCounts["delegate"] ?? 0,
        admins: roleCounts["admin"] ?? 0,
        total: sum(roleCounts),
      },
      system,
      generatedAt: new Date().toISOString(),
    });
  })

  /* -- content tables ------------------------------------------------ */
  .route(
    "/committees",
    crudRoutes({ table: committees, create: committeeCreateSchema, update: committeeUpdateSchema }),
  )
  .route(
    "/topics",
    crudRoutes({
      table: topics,
      create: topicCreateSchema,
      update: topicUpdateSchema,
      orderBy: (t) => [asc(t.committeeId)],
    }),
  )
  .route(
    "/departments",
    crudRoutes({ table: departments, create: departmentCreateSchema, update: departmentUpdateSchema }),
  )
  .route(
    "/people",
    crudRoutes({
      table: people,
      create: personCreateSchema,
      update: personUpdateSchema,
      orderBy: (t) => [asc(t.section)],
    }),
  )
  .route(
    "/resolutions",
    crudRoutes({
      table: resolutions,
      create: resolutionCreateSchema,
      update: resolutionUpdateSchema,
      orderBy: (t) => [asc(t.committeeId)],
    }),
  )
  .route(
    "/schedule/days",
    crudRoutes({ table: scheduleDays, create: scheduleDayCreateSchema, update: scheduleDayUpdateSchema }),
  )
  .route(
    "/schedule/items",
    crudRoutes({
      table: scheduleItems,
      create: scheduleItemCreateSchema,
      update: scheduleItemUpdateSchema,
      orderBy: (t) => [asc(t.dayId)],
    }),
  )
  .route(
    "/documents",
    crudRoutes({ table: documents, create: documentCreateSchema, update: documentUpdateSchema }),
  )

  /* -- FAQ (안내 챗봇 지식베이스, SiteData 밖) ----------------------- */
  .route(
    "/faqs",
    crudRoutes({ table: faqs, create: faqCreateSchema, update: faqUpdateSchema }),
  )

  /* -- 챗봇 질문-답변 로그 (읽기 + 전체 삭제) ----------------------- */
  .get("/chat-logs", async (c) => {
    const limit = Math.max(1, Math.min(Math.floor(Number(c.req.query("limit"))) || 200, 500));
    const rows = await db
      .select()
      .from(chatLogs)
      .orderBy(desc(chatLogs.createdAt))
      .limit(limit);
    return c.json(rows);
  })
  .delete("/chat-logs", async (c) => {
    await db.delete(chatLogs);
    return c.json({ ok: true });
  })

  /* -- files ---------------------------------------------------------- */
  .route("/uploads", uploadRoutes);
