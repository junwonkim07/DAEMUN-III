import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import {
  chatRequestSchema,
  defaultSite,
  type Person,
  type SiteData,
} from "@daemun/shared";
import {
  committees,
  conference,
  departments,
  announcements,
  documents,
  faqs,
  people,
  resolutions,
  scheduleDays,
  scheduleItems,
  topics,
} from "@daemun/db";
import { db } from "../db";
import {
  buildSystemPrompt,
  ChatBlockedError,
  ChatUnavailableError,
  ChatUpstreamError,
  generateReply,
} from "../lib/chat";
import { countRelevantFaqs, renderSiteContext } from "../lib/chat-context";
import { logChat } from "../lib/chat-log";
import { clientIp } from "../lib/client-ip";
import { env } from "../env";
import { rateLimit } from "../lib/rate-limit";

type BuildOptions = {
  /**
   * 공개 사이트용 페이로드인지. true면 승인되지 않은 결의안의 `document`
   * (업로드된 PDF 경로)를 응답에서 제외한다 — 리뷰 전 초안이 공개 JSON으로
   * 새는 것을 막는다. 어드민 프리뷰(`GET /api/admin/site`)는 false로 둬서
   * 모든 상태의 문서를 그대로 본다.
   */
  publicView?: boolean;
};

/** Assemble the single payload the public site renders from. */
export async function buildSiteData(opts: BuildOptions = {}): Promise<SiteData> {
  const [confRow] = await db
    .select()
    .from(conference)
    .where(eq(conference.id, "main"))
    .limit(1);

  const [
    committeeRows,
    departmentRows,
    peopleRows,
    resolutionRows,
    dayRows,
    documentRows,
    announcementRows,
  ] = await Promise.all([
    db.query.committees.findMany({
      orderBy: [asc(committees.sortOrder), asc(committees.createdAt)],
      with: { topics: { orderBy: [asc(topics.sortOrder), asc(topics.createdAt)] } },
    }),
    db.query.departments.findMany({
      orderBy: [asc(departments.sortOrder), asc(departments.createdAt)],
    }),
    db.query.people.findMany({
      orderBy: [asc(people.sortOrder), asc(people.createdAt)],
    }),
    db.query.resolutions.findMany({ orderBy: [asc(resolutions.createdAt)] }),
    db.query.scheduleDays.findMany({
      orderBy: [asc(scheduleDays.sortOrder), asc(scheduleDays.createdAt)],
      with: {
        items: { orderBy: [asc(scheduleItems.sortOrder), asc(scheduleItems.createdAt)] },
      },
    }),
    db.query.documents.findMany({
      orderBy: [asc(documents.sortOrder), asc(documents.createdAt)],
    }),
    db.query.announcements.findMany({
      orderBy: [asc(announcements.sortOrder), asc(announcements.createdAt)],
    }),
  ]);

  const strip = <T extends { createdAt: Date; updatedAt: Date }>(row: T) => {
    const { createdAt: _c, updatedAt: _u, ...rest } = row;
    return rest;
  };

  const persons: Person[] = peopleRows.map(strip);
  const bySection = (s: Person["section"]) => persons.filter((p) => p.section === s);

  const slugById = new Map(committeeRows.map((c) => [c.id, c.slug]));
  const chairs: Record<string, Person[]> = {};
  for (const c of committeeRows) chairs[c.slug] = [];
  for (const p of bySection("chair")) {
    const slug = p.committeeId ? slugById.get(p.committeeId) : undefined;
    if (slug) chairs[slug]!.push(p);
  }

  const resolutionsBySlug: Record<string, SiteData["resolutions"][string]> = {};
  for (const c of committeeRows) resolutionsBySlug[c.slug] = [];
  for (const r of resolutionRows) {
    // §6-1: pre-publish, a resolution is entirely private (admin/team only) —
    // not just its document. The admin preview (publicView: false) still
    // sees every status so review can happen before anything goes public.
    if (opts.publicView && r.status !== "published") continue;
    const slug = slugById.get(r.committeeId);
    if (!slug) continue;
    const { createdAt: _c, ...rest } = r;
    resolutionsBySlug[slug]!.push({
      ...rest,
      updatedAt: r.updatedAt.toISOString(),
    });
  }

  const { id: _id, createdAt: _c, updatedAt: _u, ...conf } = confRow ?? {
    id: "main",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...defaultSite.conference,
  };

  return {
    conference: conf,
    secretariat: {
      director: bySection("director")[0] ?? null,
      executives: bySection("executive"),
      departments: departmentRows.map((d) => ({
        ...strip(d),
        members: bySection("department").filter((p) => p.departmentId === d.id),
      })),
      chairs,
    },
    committees: committeeRows.map(({ topics: ts, ...c }) => ({
      ...strip(c),
      topics: ts.map(strip),
    })),
    resolutions: resolutionsBySlug,
    schedule: dayRows.map(({ items, ...d }) => ({
      ...strip(d),
      items: items.map(strip),
    })),
    documents: documentRows.map(strip),
    announcements: announcementRows
      .filter((a) => !opts.publicView || a.published)
      .map(strip),
  };
}

/** 안내 챗봇 응답 하나를 못 만들었을 때 보여줄 기본 문구. */
const CHAT_FALLBACK =
  "지금은 답변을 드리기 어려워요. 잠시 후 다시 시도하시거나, DAEMUN 공식 인스타그램/이메일로 문의해주세요.";

export const publicRoutes = new Hono()
  .get("/site", async (c) => {
    const data = await buildSiteData({ publicView: true });
    c.header("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    // The header above is a floor for anything that caches by itself (a direct
    // visitor, a shared proxy). Vercel's edge would honour it too and keep
    // serving a copy for up to max-age + stale-while-revalidate, which breaks
    // the one thing this endpoint must do: return fresh data the moment the web
    // app refetches after revalidateTag(). That caller — apps/web's server-side
    // getSite() — ignores this header anyway in favour of its own 60 s tagged
    // data cache, so an edge copy buys nothing and costs freshness.
    c.header("Vercel-CDN-Cache-Control", "no-store");
    return c.json(data);
  })

  /**
   * 안내 챗봇. 무상태 — 프론트가 messages 배열에 대화 전체를 담아 보낸다.
   * 공개 사이트 데이터 전체 + 공개 FAQ를 컨텍스트로 넣고 모델에 넘긴다
   * (lib/chat-context.ts — 검색 없이 통째로, 이유는 그 파일 주석).
   * 개인정보 DB(신청서 등)는 절대 참조하지 않는다 (설계안 §3-3).
   */
  .post(
    "/chat",
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (c) =>
        c.json({ reply: "메시지가 너무 깁니다. 짧게 나눠서 물어봐 주세요." }, 413),
    }),
    zValidator("json", chatRequestSchema),
    async (c) => {
      // 분당 10회 / IP — 남용·비용 폭탄 방지 (설계안 §3-3)
      const limited = rateLimit(`chat:${clientIp(c)}`, 10, 60_000);
      if (!limited.ok) {
        c.header("Retry-After", String(limited.retryAfterSec));
        return c.json(
          { reply: "메시지를 너무 빠르게 보내고 계세요. 잠시 후 다시 시도해주세요." },
          429,
        );
      }

      const { messages } = c.req.valid("json");
      if (messages[messages.length - 1]?.role !== "user") {
        return c.json({ error: "last message must be from the user" }, 400);
      }
      const lastUser = messages[messages.length - 1]!.content;

      const [site, faqRows] = await Promise.all([
        buildSiteData({ publicView: true }),
        db
          .select({ question: faqs.question, answer: faqs.answer, category: faqs.category })
          .from(faqs)
          .where(eq(faqs.published, true))
          .orderBy(asc(faqs.sortOrder)),
      ]);
      // chat_logs.faqHits — 이 질문과 겹치는 FAQ 수 (컨텍스트에는 FAQ 전부가
      // 들어가므로 답변과는 무관). 어드민 Chat logs가 0인 것을 "FAQ로 만들
      // 후보"로 고르는 데 쓴다 — 옛 검색 기반 의미를 그대로 유지.
      const faqHits = countRelevantFaqs(lastUser, faqRows);

      const conf = site.conference;
      const contact = {
        email: conf.email && conf.email !== "TBA" ? conf.email : "운영진 이메일",
        instagram: conf.instagram || "@daemun_official",
        instagramUrl: conf.instagramUrl || "#",
      };

      const systemPrompt = buildSystemPrompt(
        renderSiteContext(site, faqRows, env.webPublicUrl),
        contact,
      );

      try {
        const reply = await generateReply(messages, systemPrompt);
        logChat({ question: lastUser, answer: reply, outcome: "answered", faqHits });
        return c.json({ reply });
      } catch (err) {
        if (err instanceof ChatUnavailableError) {
          const reply = "안내 챗봇이 아직 설정되지 않았어요. 운영진에게 문의해주세요.";
          logChat({ question: lastUser, answer: reply, outcome: "unavailable", faqHits });
          return c.json({ reply }, 503);
        }
        if (err instanceof ChatBlockedError) {
          console.warn("[chat] blocked:", err.message);
          const reply =
            "그 질문에는 답변을 드리기 어려워요. 동아리 소개나 신청 절차, 일정 같은 걸 물어봐 주세요.";
          logChat({ question: lastUser, answer: reply, outcome: "blocked", faqHits });
          // 서버 잘못이 아니라 모델이 거절한 것 — 위젯이 오류로 처리하지 않게 200.
          return c.json({ reply }, 200);
        }
        if (err instanceof ChatUpstreamError) {
          console.warn("[chat] upstream:", err.message);
          logChat({
            question: lastUser,
            answer: CHAT_FALLBACK,
            outcome: "error",
            faqHits,
          });
          return c.json({ reply: CHAT_FALLBACK }, 502);
        }
        throw err;
      }
    },
  );
