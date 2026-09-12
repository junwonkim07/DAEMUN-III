import type { Person, SiteData } from "@daemun/shared";

/**
 * 안내 챗봇의 <context> — 공개 사이트 데이터 전체를 모델이 읽기 좋은 평문으로.
 *
 * 왜 검색(RAG)이 아니라 통째로 넣는가: 공개 페이로드가 통째로 수십 KB(수천
 * 토큰)라 모델 컨텍스트에 그냥 들어간다. 검색은 지식이 안 들어갈 때 쓰는
 * 기술이고, 여기서는 오히려 "필요한 사실이 모델 앞에 없는" 실패만 만든다.
 * 관리자가 사이트 내용을 고치면 다음 요청부터 챗봇 답도 같이 바뀐다.
 *
 * 뺀 것: 사진·자기소개문(greeting) — 부피만 크고 질문에 쓰이지 않는다.
 * 결의안 목록 — 참가자 개인 작업물이라 챗봇이 언급할 일이 없다.
 */

export type ChatFaq = { question: string; answer: string; category: string };

const PAGES = [
  ["홈", "/"],
  ["소개", "/about"],
  ["위원회·의제", "/committees"],
  ["사무국", "/secretariat"],
  ["공지사항", "/announcements"],
  ["결의안 현황", "/resolutions"],
  ["모의유엔 가이드 (Guide to MUN)", "/guide"],
  ["참가자 로그인·계정", "/login"],
] as const;

const MAX_BODY = 600;

const clip = (s: string, n = MAX_BODY) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
const has = (s: string | null | undefined): s is string => !!s && s.trim() !== "";
const person = (p: Person) => (has(p.role) ? `${p.name} (${p.role})` : p.name);

export function renderSiteContext(site: SiteData, faqs: ChatFaq[], webUrl: string): string {
  const c = site.conference;
  const link = (path: string) => (/^https?:\/\//.test(path) ? path : `${webUrl}${path}`);
  const out: string[] = [];

  out.push("[회의 정보]");
  out.push(`이름: ${c.name} · 주최: ${c.org} · 세션: ${c.session}`);
  out.push(`일정: ${c.dates} · 장소: ${c.venue}${has(c.address) ? ` (${c.address})` : ""}`);
  if (has(c.theme)) out.push(`대주제: ${c.theme}`);
  if (has(c.firstHeld)) out.push(`첫 개최: ${c.firstHeld}`);
  if (has(c.aboutLead) || has(c.aboutBody)) {
    out.push(`소개: ${[c.aboutLead, c.aboutBody].filter(has).join(" ")}`);
  }
  if (has(c.themeLead) || has(c.themeBody)) {
    out.push(`대주제 설명: ${[c.themeLead, c.themeBody].filter(has).join(" ")}`);
  }
  const contacts = [
    has(c.email) ? `이메일 ${c.email}` : null,
    has(c.instagram) ? `인스타그램 @${c.instagram}${has(c.instagramUrl) ? ` (${c.instagramUrl})` : ""}` : null,
    has(c.instagram2)
      ? `인스타그램 @${c.instagram2}${has(c.instagramUrl2) ? ` (${c.instagramUrl2})` : ""}`
      : null,
  ].filter(has);
  if (contacts.length > 0) out.push(`문의처: ${contacts.join(" · ")}`);
  out.push(`사이트 페이지: ${PAGES.map(([label, path]) => `${label} ${link(path)}`).join(" · ")}`);

  out.push("", "[위원회와 의제]");
  if (site.committees.length === 0) out.push("(아직 공개된 위원회가 없습니다)");
  for (const cm of site.committees) {
    out.push(`${cm.code} — ${cm.name}${has(cm.description) ? `: ${clip(cm.description)}` : ""}`);
    const chairs = site.secretariat.chairs[cm.slug] ?? [];
    if (chairs.length > 0) out.push(`  의장단: ${chairs.map(person).join(", ")}`);
    cm.topics.forEach((t, i) => {
      out.push(`  의제 ${i + 1}: ${t.title}${has(t.summary) ? ` — ${clip(t.summary)}` : ""}`);
      if (has(t.report)) out.push(`    의장 보고서(Chair Report): ${link(t.report)}`);
    });
  }

  out.push("", "[일정]");
  if (site.schedule.length === 0) out.push("(아직 공개된 일정이 없습니다)");
  for (const d of site.schedule) {
    out.push(`${d.day}${has(d.date) ? ` (${d.date})` : ""}`);
    for (const it of d.items) {
      out.push(`  ${it.time} — ${it.event}${it.urgent ? " [중요/마감]" : ""}`);
    }
  }

  out.push("", "[문서 자료]");
  if (site.documents.length === 0) out.push("(아직 공개된 문서가 없습니다)");
  for (const d of site.documents) {
    const meta = [d.kind, d.size].filter(has).join(", ");
    out.push(
      `- ${d.title}${meta ? ` (${meta})` : ""}${has(d.blurb) ? `: ${clip(d.blurb, 200)}` : ""} → ${link(d.file)}`,
    );
  }

  out.push("", "[공지사항]");
  if (site.announcements.length === 0) out.push("(현재 공지가 없습니다)");
  for (const a of site.announcements) {
    out.push(
      `- ${has(a.date) ? `[${a.date}] ` : ""}${a.title}${a.urgent ? " [긴급]" : ""}${has(a.body) ? `: ${clip(a.body)}` : ""}`,
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
      `${dept.name}${has(dept.blurb) ? ` — ${clip(dept.blurb, 200)}` : ""}${members ? ` · 부원: ${members}` : ""}`,
    );
  }

  out.push("", "[자주 묻는 질문 (운영진 작성)]");
  if (faqs.length === 0) out.push("(등록된 FAQ가 없습니다)");
  for (const f of faqs) {
    out.push(`Q${has(f.category) ? ` (${f.category})` : ""}: ${f.question}`);
    out.push(`A: ${f.answer}`);
  }

  return out.join("\n");
}
