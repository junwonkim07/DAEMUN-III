// apps/admin/src/lib/api.ts
//
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

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === "string") return err;
    // zod 에러: { error: { issues: [...] } } 또는 hono zValidator 형태
    if (err && typeof err === "object") return "입력값이 올바르지 않습니다.";
  }
  return `요청이 실패했습니다 (HTTP ${status}).`;
}

/**
 * `/api/admin` 아래 엔드포인트를 호출한다. 2xx가 아니면 ApiError를 던진다.
 * FormData면 Content-Type을 브라우저가 붙이도록 두고, 그 외 body는 JSON으로 본다.
 */
export async function adminFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api/admin${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401) {
    // 세션 만료/무효 — 로그인으로. 라우터 push가 아니라 전체 새로고침으로
    // 보내서 react-query 캐시·better-auth 세션 상태를 싹 비운다.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
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
    throw new ApiError(res.status, messageFromBody(body, res.status), body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** multipart 업로드. 허용: jpg/png/webp/pdf/doc/docx, 25MB (API가 강제). */
export async function uploadFile(file: File): Promise<{
  url: string;
  originalName: string;
  kind: string;
  bytes: number;
  size: string;
}> {
  const form = new FormData();
  form.append("file", file);
  return adminFetch("/uploads", { method: "POST", body: form });
}
