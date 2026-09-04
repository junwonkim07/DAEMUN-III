import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { asc, desc, eq } from "drizzle-orm";
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
} from "@daemun/db";
import { db } from "../db";
import { crudRoutes } from "../lib/crud";
import { revalidateWeb } from "../lib/revalidate";
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
    const limit = Math.min(Number(c.req.query("limit") ?? 200) || 200, 500);
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
