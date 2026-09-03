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
   * Where the API reaches the web app (revalidate webhook). Inside Docker
   * Compose this is the service name, so it is *not* a browser-facing URL.
   */
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  /**
   * Public origin of the delegate-facing site as seen by browsers. Used for
   * trustedOrigins (the site proxies /api/auth to us) and for the links in
   * verification / password-reset emails.
   */
  webPublicUrl: process.env.WEB_PUBLIC_URL ?? "http://localhost:3000",

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

  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 25) * 1024 * 1024,

  /** First admin account, created on boot when no users exist. */
  bootstrapAdminEmail: process.env.ADMIN_EMAIL ?? "",
  bootstrapAdminPassword: process.env.ADMIN_PASSWORD ?? "",
  bootstrapAdminName: process.env.ADMIN_NAME ?? "Administrator",
};
