import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

const str = z.string().trim();
const optStr = str.nullable().optional();
const sortOrder = z.number().int().min(0).optional();

// PATCH용 *UpdateSchema는 default를 붙이기 전의 "*Fields"를 partial()해서 만든다.
// createSchema.partial()은 .default() 필드를 키 부재 시 재적용해서, 한 필드만
// 수정해도 나머지가 기본값으로 덮어써지는 버그가 있다 (Zod).

/* ------------------------------------------------------------------ */
/*  Conference (singleton)                                             */
/* ------------------------------------------------------------------ */

export const conferenceSchema = z.object({
  name: str.min(1),
  org: str.min(1),
  theme: str,
  session: str,
  dates: str,
  venue: str,
  email: str,
  instagram: str,
  instagramUrl: str,
  address: str,
  firstHeld: str,
  aboutLead: str,
  aboutBody: str,
  themeLead: str,
  themeBody: str,
});
export type Conference = z.infer<typeof conferenceSchema>;
export const conferenceUpdateSchema = conferenceSchema.partial();

/* ------------------------------------------------------------------ */
/*  Secretariat                                                        */
/* ------------------------------------------------------------------ */

export const personSectionSchema = z.enum([
  "director",
  "executive",
  "department",
  "chair",
]);
export type PersonSection = z.infer<typeof personSectionSchema>;

export const personSchema = z.object({
  id: str,
  name: str.min(1),
  role: str,
  photo: str.nullable(),
  greeting: str.nullable(),
  section: personSectionSchema,
  departmentId: str.nullable(),
  committeeId: str.nullable(),
  sortOrder: z.number().int(),
});
export type Person = z.infer<typeof personSchema>;

const personFields = {
  name: str.min(1),
  role: str,
  photo: optStr,
  greeting: optStr,
  section: personSectionSchema,
  departmentId: optStr,
  committeeId: optStr,
  sortOrder,
};
export const personCreateSchema = z
  .object(personFields)
  .extend({ role: str.default("") });
export const personUpdateSchema = z.object(personFields).partial();

export const departmentSchema = z.object({
  id: str,
  name: str.min(1),
  blurb: str,
  sortOrder: z.number().int(),
});
export type Department = z.infer<typeof departmentSchema>;
const departmentFields = { name: str.min(1), blurb: str, sortOrder };
export const departmentCreateSchema = z
  .object(departmentFields)
  .extend({ blurb: str.default("") });
export const departmentUpdateSchema = z.object(departmentFields).partial();

/* ------------------------------------------------------------------ */
/*  Committees & topics                                                */
/* ------------------------------------------------------------------ */

export const topicSchema = z.object({
  id: str,
  committeeId: str,
  title: str,
  summary: str,
  /** PDF path — null renders "available September" */
  report: str.nullable(),
  sortOrder: z.number().int(),
});
export type Topic = z.infer<typeof topicSchema>;
const topicFields = {
  committeeId: str,
  title: str,
  summary: str,
  report: optStr,
  sortOrder,
};
export const topicCreateSchema = z
  .object(topicFields)
  .extend({ title: str.default("TBA"), summary: str.default("") });
export const topicUpdateSchema = z.object(topicFields).partial();

export const committeeSchema = z.object({
  id: str,
  slug: str.min(1).regex(/^[a-z0-9-]+$/, "lowercase letters, digits, dashes"),
  code: str.min(1),
  name: str.min(1),
  description: str,
  image: str.nullable(),
  sourceLabel: str.nullable(),
  sourceUrl: str.nullable(),
  sortOrder: z.number().int(),
});
export type Committee = z.infer<typeof committeeSchema>;
const committeeFields = committeeSchema
  .omit({ id: true, sortOrder: true })
  .extend({ image: optStr, sourceLabel: optStr, sourceUrl: optStr, sortOrder }).shape;
export const committeeCreateSchema = z
  .object(committeeFields)
  .extend({ description: str.default("") });
export const committeeUpdateSchema = z.object(committeeFields).partial();

export type CommitteeWithTopics = Committee & { topics: Topic[] };

/* ------------------------------------------------------------------ */
/*  Resolutions                                                        */
/* ------------------------------------------------------------------ */

export const resolutionStatusSchema = z.enum(["approved", "review", "awaiting"]);
export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>;

export const resolutionSchema = z.object({
  id: str,
  committeeId: str,
  topicId: str,
  label: str,
  submitter: str,
  status: resolutionStatusSchema,
  document: str.nullable(),
  sortOrder: z.number().int(),
  updatedAt: z.string(),
});
export type Resolution = z.infer<typeof resolutionSchema>;
const resolutionFields = {
  committeeId: str,
  topicId: str,
  label: str,
  submitter: str,
  status: resolutionStatusSchema,
  document: optStr,
  sortOrder,
};
export const resolutionCreateSchema = z.object(resolutionFields).extend({
  label: str.default(""),
  submitter: str.default(""),
  status: resolutionStatusSchema.default("awaiting"),
});
export const resolutionUpdateSchema = z.object(resolutionFields).partial();

/* ------------------------------------------------------------------ */
/*  Schedule                                                           */
/* ------------------------------------------------------------------ */

export const scheduleItemSchema = z.object({
  id: str,
  dayId: str,
  time: str,
  event: str,
  sortOrder: z.number().int(),
});
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
const scheduleItemFields = { dayId: str, time: str, event: str.min(1), sortOrder };
export const scheduleItemCreateSchema = z
  .object(scheduleItemFields)
  .extend({ time: str.default("TBA") });
export const scheduleItemUpdateSchema = z.object(scheduleItemFields).partial();

export const scheduleDaySchema = z.object({
  id: str,
  day: str,
  date: str,
  sortOrder: z.number().int(),
});
export type ScheduleDay = z.infer<typeof scheduleDaySchema>;
const scheduleDayFields = { day: str.min(1), date: str, sortOrder };
export const scheduleDayCreateSchema = z
  .object(scheduleDayFields)
  .extend({ date: str.default("TBA") });
export const scheduleDayUpdateSchema = z.object(scheduleDayFields).partial();

export type ScheduleDayWithItems = ScheduleDay & { items: ScheduleItem[] };

/* ------------------------------------------------------------------ */
/*  Documents                                                          */
/* ------------------------------------------------------------------ */

export const documentSchema = z.object({
  id: str,
  title: str,
  blurb: str,
  file: str,
  kind: str,
  size: str,
  sortOrder: z.number().int(),
});
export type SiteDocument = z.infer<typeof documentSchema>;
const documentFields = {
  title: str.min(1),
  blurb: str,
  file: str.min(1),
  kind: str,
  size: str,
  sortOrder,
};
export const documentCreateSchema = z.object(documentFields).extend({
  blurb: str.default(""),
  kind: str.default("PDF"),
  size: str.default(""),
});
export const documentUpdateSchema = z.object(documentFields).partial();

/* ------------------------------------------------------------------ */
/*  FAQ (안내 챗봇 지식베이스 — SiteData에는 포함되지 않는다)          */
/* ------------------------------------------------------------------ */

export const faqSchema = z.object({
  id: str,
  question: str,
  answer: str,
  category: str,
  published: z.boolean(),
  sortOrder: z.number().int(),
  updatedAt: z.string(),
});
export type Faq = z.infer<typeof faqSchema>;

const faqFields = {
  question: str.min(1),
  answer: str,
  category: str,
  published: z.boolean(),
  sortOrder,
};
export const faqCreateSchema = z.object(faqFields).extend({
  question: str.min(1).default("새 질문"),
  answer: str.default(""),
  category: str.default(""),
  published: z.boolean().default(true),
});
export const faqUpdateSchema = z.object(faqFields).partial();

/* ------------------------------------------------------------------ */
/*  Chat (안내 챗봇 — 공개 엔드포인트 POST /api/chat)                   */
/* ------------------------------------------------------------------ */

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: str.min(1).max(4000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * 챗봇은 무상태다 — 프론트가 매 요청에 대화 전체를 보낸다. 서버는 최근
 * 몇 턴만 모델에 전달한다(비용 상한). 마지막 메시지는 반드시 user.
 */
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({ reply: str });
export type ChatResponse = z.infer<typeof chatResponseSchema>;

/* ------------------------------------------------------------------ */
/*  Reorder                                                            */
/* ------------------------------------------------------------------ */

export const reorderSchema = z.object({ ids: z.array(str).min(1) });

/* ------------------------------------------------------------------ */
/*  Aggregate payload served to the public site                        */
/* ------------------------------------------------------------------ */

export type Secretariat = {
  director: Person | null;
  executives: Person[];
  departments: (Department & { members: Person[] })[];
  /** committee slug → chairs (head chair first) */
  chairs: Record<string, Person[]>;
};

export type SiteData = {
  conference: Conference;
  secretariat: Secretariat;
  committees: CommitteeWithTopics[];
  /** committee slug → resolutions */
  resolutions: Record<string, Resolution[]>;
  schedule: ScheduleDayWithItems[];
  documents: SiteDocument[];
};
