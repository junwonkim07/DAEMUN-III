import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    if (isProd) throw new Error(`Missing required env var ${name}`);
    return "";
  }
  return v;
}

const adminUrl = process.env.ADMIN_URL ?? "http://localhost:3001";

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://daemun:daemun@localhost:5432/daemun",

  /** Public origin of the admin panel — auth cookies live there. */
  adminUrl,
  /**
   * Where the API reaches the web app (revalidate webhook). On the hosted
   * stack this is the site's public origin; locally, the dev server.
   */
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  /**
   * Public origin of the delegate-facing site as seen by browsers. Used for
   * trustedOrigins (the site proxies /api/auth to us), for the links in
   * verification / password-reset emails, and for every page link the
   * chatbot hands to visitors — hence required in production (a silent
   * localhost fallback would put http://localhost:3000/... in chat replies).
   */
  webPublicUrl: isProd
    ? required("WEB_PUBLIC_URL")
    : (process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"),

  authSecret: required(
    "BETTER_AUTH_SECRET",
    isProd ? undefined : "dev-only-secret-change-me-in-production",
  ),
  /** Shared secret for the web app's /api/revalidate webhook. */
  revalidateSecret: process.env.REVALIDATE_SECRET ?? "",

  /** Outgoing mail. Unset SMTP_HOST -> links are logged to the console instead. */
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "DAEMUN III <no-reply@daemun.local>",
  },

  /**
   * 안내 챗봇(POST /api/public/chat)이 쓰는 Gemini API. 아래 aiGateway와 이것
   * 둘 다 없으면 엔드포인트는 503과 안내 문구를 돌려준다 — 키 없이도 나머지는 동작.
   * 무료 키: https://aistudio.google.com/apikey
   *
   * 모델 기본값 `gemini-2.5-flash` — 무료 티어에 있고 성숙해서 가용성이 안정적.
   * (flash-lite-latest = 최신 모델이라 "high demand" 503이 잦음.) GEMINI_MODEL로 교체.
   */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },

  /**
   * Vercel AI Gateway — 설정돼 있으면 챗봇이 이쪽을 먼저 쓴다 (lib/chat.ts).
   * 기본 모델은 게이트웨이 카탈로그에서 토큰 단가가 0인 범용 텍스트 모델.
   * 게이트웨이가 실패하면(무료 모델 한도·장애) GEMINI_API_KEY가 있을 때
   * Gemini 직접 호출로 넘어간다. 키: Vercel → AI Gateway → API Keys.
   * 모델 목록·가격: https://ai-gateway.vercel.sh/v1/models
   */
  aiGateway: {
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
    model: process.env.AI_GATEWAY_MODEL ?? "inclusionai/ling-3.0-flash-vl-free",
  },

  /**
   * Which storage backend uploaded files go to — see lib/storage. "local"
   * writes to uploadDir on this server's own disk, which needs a persistent
   * filesystem and a single long-lived process.
   */
  uploadDriver: process.env.UPLOAD_DRIVER ?? "local",
  /** Where the "local" storage driver keeps files. */
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 25) * 1024 * 1024,

  /** First admin account, created on boot when no users exist. */
  bootstrapAdminEmail: process.env.ADMIN_EMAIL ?? "",
  bootstrapAdminPassword: process.env.ADMIN_PASSWORD ?? "",
  bootstrapAdminName: process.env.ADMIN_NAME ?? "Administrator",
};
