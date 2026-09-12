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
  startReply,
} from "../lib/chat";
import { countRelevantFaqs, renderSiteContext, type ChatFaq } from "../lib/chat-context";
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

/**
 * 챗봇 <context>는 요청마다 사이트 전체를 다시 조회·렌더링하면 대화 한 턴에
 * DB 쿼리가 9개씩 나간다. 내용은 초 단위로 바뀌지 않으니 인스턴스 안에서 잠깐
 * 재사용한다. (서버리스라 인스턴스마다 따로, 그리고 TTL 뒤에는 관리자 수정이
 * 그대로 반영된다.)
 */
const CHAT_CONTEXT_TTL_MS = 20_000;
type ChatContact = { email: string; instagram: string; instagramUrl: string };
type ChatContext = { at: number; context: string; faqs: ChatFaq[]; contact: ChatContact };
let chatContextCache: ChatContext | null = null;

async function loadChatContext(): Promise<ChatContext> {
  const now = Date.now();
  if (chatContextCache && now - chatContextCache.at < CHAT_CONTEXT_TTL_MS) {
    return chatContextCache;
  }
  const [site, faqRows] = await Promise.all([
    buildSiteData({ publicView: true }),
    db
      .select({ question: faqs.question, answer: faqs.answer, category: faqs.category })
      .from(faqs)
      .where(eq(faqs.published, true))
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt)),
  ]);
  const conf = site.conference;
  const contact = {
    email: conf.email && conf.email !== "TBA" ? conf.email : "운영진 이메일",
    instagram: conf.instagram && conf.instagram !== "TBA" ? conf.instagram : "공식 인스타그램",
    instagramUrl: conf.instagramUrl || "#",
  };
  chatContextCache = {
    at: now,
    context: renderSiteContext(site, faqRows, env.webPublicUrl),
    faqs: faqRows,
    contact,
  };
  return chatContextCache;
}

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

      const { context, faqs: faqRows, contact } = await loadChatContext();
      // chat_logs.faqHits — 이 질문과 겹치는 FAQ 수 (컨텍스트에는 FAQ 전부가
      // 들어가므로 답변과는 무관). 어드민 Chat logs가 0인 것을 "겹치는 FAQ가
      // 없는 질문"으로 표시하는 데 쓴다 — 옛 검색 기반 의미를 그대로 유지.
      const faqHits = countRelevantFaqs(lastUser, faqRows);

      const systemPrompt = buildSystemPrompt(context, contact);

      let stream: AsyncIterable<string>;
      try {
        // 첫 조각까지 여기서 받는다 — 아래 catch의 오류 응답들은 그래서
        // 200 스트림을 열기 전에 나갈 수 있다.
        stream = await startReply(messages, systemPrompt);
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

      // 여기부터는 200 + SSE. 위젯은 content-type으로 이 경우와 위 JSON 오류
      // 응답을 가른다.
      //
      // 왜 평문이 아니라 SSE인가: 사이에 낀 프록시(Next dev 서버, CDN)가 평문
      // 응답은 gzip으로 묶어 버퍼링해 버려서 끝나야 한 덩어리로 도착한다.
      // text/event-stream은 그 경로들이 전부 예외 처리해 조각이 그대로 흐른다.
      // 조각은 JSON 문자열로 감싼다 — 줄바꿈이 SSE 프레이밍을 깨지 않도록.
      let full = "";
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (line: string) => controller.enqueue(encoder.encode(line));
          try {
            for await (const piece of stream) {
              full += piece;
              send(`data: ${JSON.stringify(piece)}\n\n`);
            }
          } catch (err) {
            // 스트림 도중 끊김 — 받은 데까지는 살리고 조용히 끝낸다.
            console.warn("[chat] stream ended early:", (err as Error).message);
          } finally {
            send("data: [DONE]\n\n");
            logChat({
              question: lastUser,
              answer: full || CHAT_FALLBACK,
              outcome: full ? "answered" : "error",
              faqHits,
            });
            controller.close();
          }
        },
      });

      return c.body(body, 200, {
        "content-type": "text/event-stream; charset=utf-8",
        // no-transform: 중간 프록시가 압축 등으로 본문을 건드리지 못하게 한다.
        "cache-control": "no-cache, no-store, no-transform",
        "x-accel-buffering": "no",
      });
    },
  );
