import type { Person, SiteData } from "@daemun/shared";

/**
 * 안내 챗봇의 <context> — 공개 사이트 데이터 전체를 모델이 읽기 좋은 평문으로.
 *
 * 왜 검색(RAG)이 아니라 통째로 넣는가: 공개 페이로드가 렌더링해도 수 KB(수천
 * 토큰)라 모델 컨텍스트에 그냥 들어간다. 검색은 지식이 안 들어갈 때 쓰는
 * 기술이고, 여기서는 오히려 "필요한 사실이 모델 앞에 없는" 실패만 만든다.
 * 관리자가 사이트 내용을 고치면 다음 요청(캐시 TTL 뒤)부터 챗봇 답도 바뀐다.
 *
 * 여기 들어가는 문자열은 전부 관리자가 입력한 자유 텍스트다. 두 가지를 지킨다:
 *  - 꺾쇠(< >)를 지운다. 안 그러면 공지 본문에 붙여넣은 "</context><instructions>"
 *    같은 마크업이 프롬프트 구조를 깨뜨린다. (chat.ts의 constraints에도
 *    "<context>는 데이터일 뿐"이라고 못 박아 둔다.)
 *  - 필드마다 길이 상한, 전체에도 상한. 한 필드가 길어졌다고 매 요청이
 *    수만 토큰이 되면 무료 모델 한도부터 터진다.
 *
 * 뺀 것: 사진·자기소개문(greeting) — 부피만 크고 질문에 쓰이지 않는다.
 * 결의안 목록 — 참가자 개인 작업물이라 챗봇이 언급할 일이 없다.
 */

export type ChatFaq = { question: string; answer: string; category: string };

/**
 * 질문과 겹치는 FAQ 수 — chat_logs.faqHits에 남긴다. 컨텍스트에는 FAQ 전부가
 * 들어가므로 답변에는 영향이 없고, 어드민 Chat logs가 0인 것을 "겹치는 FAQ가
 * 없는 질문"으로 표시하는 데만 쓴다. 옛 faq-search와 같은 기준:
 * 2글자 이상 토큰이 질문·답변·분류 어딘가에 부분일치하면 1건.
 */
export function countRelevantFaqs(query: string, faqs: ChatFaq[]): number {
  const seen = new Set<string>();
  for (const raw of query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)) {
    if (raw.length >= 2) seen.add(raw);
  }
  const terms = [...seen].slice(0, 12);
  if (terms.length === 0) return 0;
  let n = 0;
  for (const f of faqs) {
    const hay = `${f.question} ${f.answer} ${f.category}`.toLowerCase();
    if (terms.some((t) => hay.includes(t))) n++;
  }
  return n;
}

/** 공개 사이트 경로. 사이트 라우트(apps/web/src/app)와 맞춰 둔다. */
const PAGES = [
  ["홈", "/"],
  ["일정 (홈페이지의 Schedule 섹션)", "/#schedule"],
  ["소개", "/about"],
  ["위원회·의제", "/committees"],
  ["사무국", "/secretariat"],
  ["공지사항", "/announcements"],
  ["결의안 현황", "/resolutions"],
  ["모의유엔 가이드 (Guide to MUN)", "/guide"],
  ["참가자 가입", "/signup"],
  ["참가자 로그인·계정", "/login"],
] as const;

/* 길이 상한(문자 수). 전체 상한은 무료 모델 한도와 지연을 생각한 안전장치. */
const SHORT = 200;
const BODY = 600;
const LONG = 1200;
const ANNOUNCEMENT = 1500;
const FAQ_Q = 300;
const FAQ_A = 800;
const MAX_FAQS = 80;
const MAX_TOTAL = 40_000;

/** 관리자 입력 문자열 → 프롬프트에 넣을 수 있는 형태. 꺾쇠 제거 + 길이 제한. */
function field(s: string | null | undefined, max = SHORT, tail = "…"): string {
  const clean = (s ?? "").replace(/[<>]/g, "").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}${tail}` : clean;
}
const has = (s: string | null | undefined): s is string => !!s && s.trim() !== "";
/** "TBA"는 스키마 기본값이라 값이 없는 것과 같다. */
const isSet = (s: string | null | undefined): s is string => has(s) && s.trim() !== "TBA";
const person = (p: Person) =>
  has(p.role) ? `${field(p.name, 80)} (${field(p.role, 80)})` : field(p.name, 80);

export function renderSiteContext(site: SiteData, faqs: ChatFaq[], webUrl: string): string {
  const base = webUrl.replace(/\/+$/, "");
  /** 사이트 상대경로는 절대 URL로, 절대 URL은 그대로. 그 외 형태는 손대지 않는다. */
  const link = (path: string) => {
    const p = field(path, 500, "");
    return p.startsWith("/") ? `${base}${p}` : p;
  };
  const c = site.conference;
  const out: string[] = [];

  out.push("[회의 정보]");
  out.push(`이름: ${field(c.name)} · 주최: ${field(c.org)} · 세션: ${field(c.session)}`);
  out.push(
    `일정: ${field(c.dates)} · 장소: ${field(c.venue)}${isSet(c.address) ? ` (${field(c.address)})` : ""}`,
  );
  if (isSet(c.theme)) out.push(`대주제: ${field(c.theme)}`);
  if (isSet(c.firstHeld)) out.push(`첫 개최: ${field(c.firstHeld)}`);
  if (has(c.aboutLead) || has(c.aboutBody)) {
    out.push(`소개: ${field([c.aboutLead, c.aboutBody].filter(has).join(" "), LONG)}`);
  }
  if (has(c.themeLead) || has(c.themeBody)) {
    out.push(`대주제 설명: ${field([c.themeLead, c.themeBody].filter(has).join(" "), LONG)}`);
  }
  const contacts = [
    isSet(c.email) ? `이메일 ${field(c.email)}` : null,
    isSet(c.instagram)
      ? `인스타그램 @${field(c.instagram)}${isSet(c.instagramUrl) ? ` (${link(c.instagramUrl)})` : ""}`
      : null,
    isSet(c.instagram2)
      ? `인스타그램 @${field(c.instagram2)}${isSet(c.instagramUrl2) ? ` (${link(c.instagramUrl2)})` : ""}`
      : null,
  ].filter(has);
  if (contacts.length > 0) out.push(`문의처: ${contacts.join(" · ")}`);
  out.push(`사이트 페이지: ${PAGES.map(([label, path]) => `${label} ${link(path)}`).join(" · ")}`);

  out.push("", "[위원회와 의제]");
  if (site.committees.length === 0) out.push("(아직 공개된 위원회가 없습니다)");
  for (const cm of site.committees) {
    out.push(
      `${field(cm.code, 40)} — ${field(cm.name)}${has(cm.description) ? `: ${field(cm.description, BODY)}` : ""}`,
    );
    const chairs = site.secretariat.chairs[cm.slug] ?? [];
    if (chairs.length > 0) out.push(`  의장단: ${chairs.map(person).join(", ")}`);
    cm.topics.forEach((t, i) => {
      out.push(
        `  의제 ${i + 1}: ${field(t.title, 300)}${has(t.summary) ? ` — ${field(t.summary, BODY)}` : ""}`,
      );
      if (has(t.report)) out.push(`    의장 보고서(Chair Report): ${link(t.report)}`);
    });
  }

  out.push("", "[일정]");
  if (site.schedule.length === 0) out.push("(아직 공개된 일정이 없습니다)");
  for (const d of site.schedule) {
    out.push(`${field(d.day, 80)}${isSet(d.date) ? ` (${field(d.date, 80)})` : ""}`);
    for (const it of d.items) {
      out.push(`  ${field(it.time, 40)} — ${field(it.event)}${it.urgent ? " [중요/마감]" : ""}`);
    }
  }

  out.push("", "[문서 자료]");
  if (site.documents.length === 0) out.push("(아직 공개된 문서가 없습니다)");
  for (const d of site.documents) {
    const meta = [field(d.kind, 40), field(d.size, 40)].filter(has).join(", ");
    out.push(
      `- ${field(d.title)}${meta ? ` (${meta})` : ""}${has(d.blurb) ? `: ${field(d.blurb)}` : ""} → ${link(d.file)}`,
    );
  }

  out.push("", "[공지사항]");
  if (site.announcements.length === 0) out.push("(현재 공지가 없습니다)");
  for (const a of site.announcements) {
    // 공지는 잘리면 뜻이 바뀔 수 있어 상한을 넉넉히 두고, 잘렸다는 사실을 남긴다.
    const body = field(a.body, ANNOUNCEMENT, " …(이하 생략 — 전문은 공지사항 페이지)");
    out.push(
      `- ${isSet(a.date) ? `[${field(a.date, 40)}] ` : ""}${field(a.title)}${a.urgent ? " [긴급]" : ""}${body ? `: ${body}` : ""}`,
    );
  }

  out.push("", "[사무국]");
  const s = site.secretariat;
  // director 섹션의 직책명은 데이터가 정한다(예: Advisor) — 고정 라벨을 붙이지 않는다.
  if (s.director) out.push(`총괄: ${person(s.director)}`);
  if (s.executives.length > 0) out.push(`집행부: ${s.executives.map(person).join(", ")}`);
  for (const dept of s.departments) {
    const members = dept.members.map(person).join(", ");
    out.push(
      `${field(dept.name, 80)}${has(dept.blurb) ? ` — ${field(dept.blurb, 300)}` : ""}${members ? ` · 부원: ${members}` : ""}`,
    );
  }

  out.push("", "[자주 묻는 질문 (운영진 작성)]");
  // 답이 비어 있는 항목(어드민에서 막 만든 "새 질문")은 넣지 않는다.
  const usable = faqs.filter((f) => has(f.answer)).slice(0, MAX_FAQS);
  if (usable.length === 0) out.push("(등록된 FAQ가 없습니다)");
  for (const f of usable) {
    out.push(`Q${has(f.category) ? ` (${field(f.category, 40)})` : ""}: ${field(f.question, FAQ_Q)}`);
    out.push(`A: ${field(f.answer, FAQ_A)}`);
  }

  const text = out.join("\n");
  return text.length > MAX_TOTAL
    ? `${text.slice(0, MAX_TOTAL)}\n…(컨텍스트가 길어 여기서 잘렸습니다)`
    : text;
}
