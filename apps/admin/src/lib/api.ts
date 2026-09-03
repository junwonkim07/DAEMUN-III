// 관리자 API 호출 얇은 래퍼. next.config.ts가 /api/*를 API 서버(:4000)로
// rewrite하므로 여기서는 same-origin 상대 경로만 쓴다 — 세션 쿠키가
// 자동으로 실린다 (handover.md §3).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** zod 이슈 하나를 "필드: 메시지" 한 줄로. */
function issueLine(issue: unknown): string | null {
  if (!issue || typeof issue !== "object") return null;
  const { path, message } = issue as { path?: unknown; message?: unknown };
  if (typeof message !== "string") return null;
  const field = Array.isArray(path) && path.length > 0 ? path.join(".") : null;
  return field ? `${field}: ${message}` : message;
}

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string") return b.error;
    if (typeof b.message === "string") return b.message;
    // @hono/zod-validator: { success: false, error: { issues: [...] } }
    const issues = (b.error as { issues?: unknown[] } | undefined)?.issues;
    if (Array.isArray(issues)) {
      const lines = issues.map(issueLine).filter((l): l is string => !!l);
      if (lines.length > 0) return `입력값이 올바르지 않습니다 — ${lines.join("; ")}`;
      return "입력값이 올바르지 않습니다.";
    }
  }
  return `요청이 실패했습니다 (HTTP ${status}).`;
}

let redirectingToLogin = false;

/**
 * `/api/admin` 아래 엔드포인트를 호출한다. 2xx가 아니면 ApiError를 던진다.
 * FormData면 Content-Type을 브라우저가 붙이도록 두고, 그 외 body는 JSON으로 본다.
 */
export async function adminFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const h = new Headers(headers);
  if (json !== undefined && !h.has("content-type")) {
    h.set("content-type", "application/json");
  }
  const res = await fetch(`/api/admin${path}`, {
    ...rest,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401) {
    // 세션 만료/무효 — 로그인으로. 라우터 push가 아니라 전체 새로고침으로
    // 보내서 react-query 캐시·better-auth 세션 상태를 싹 비운다.
    // (react-query retry로 401이 연달아 와도 한 번만 이동)
    if (typeof window !== "undefined" && !redirectingToLogin) {
      redirectingToLogin = true;
      const next = window.location.pathname + window.location.search;
      // 의도적인 전체 새로고침 (router.push는 캐시·세션 상태를 남긴다)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
    throw new ApiError(401, "로그인이 필요합니다.");
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      /* 본문 없음 */
    }
    const message =
      res.status === 403
        ? "권한이 없습니다. 관리자 계정으로 로그인했는지 확인하세요."
        : messageFromBody(body, res.status);
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** API의 업로드 상한 (apps/api/src/env.ts MAX_UPLOAD_MB 기본값과 동일). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** multipart 업로드. 허용: jpg/png/webp/pdf/doc/docx, 25MB (API가 강제). */
export async function uploadFile(file: File): Promise<{
  url: string;
  originalName: string;
  kind: string;
  bytes: number;
  size: string;
}> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, `파일이 25MB를 넘습니다 (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
  }
  const form = new FormData();
  form.append("file", file);
  return adminFetch("/uploads", { method: "POST", body: form });
}
