import { upload } from "@vercel/blob/client";
import {
  extensionOf,
  humanSize,
  uploadTypeOf,
  uuid,
  type SavedFile,
  type UploadConfig,
} from "@daemun/shared";

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
      if (lines.length > 0) return `Invalid input — ${lines.join("; ")}`;
      return "Invalid input.";
    }
  }
  return `Request failed (HTTP ${status}).`;
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
    throw new ApiError(401, "Sign-in required.");
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
        ? "You don't have permission. Check that you're signed in with an admin account."
        : messageFromBody(body, res.status);
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** API의 업로드 상한 (apps/api/src/env.ts MAX_UPLOAD_MB 기본값과 동일). */
/**
 * 화면에서 파일 고르는 즉시(await 없이) 거르기 위한 낙관적 상한. 서버의
 * MAX_UPLOAD_MB 기본값과 같은 값이고, 진짜 강제는 uploadFile()이 서버가
 * 내려준 config로 한다.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** 서버 설정은 한 번만 받아 재사용한다. 실패하면 다음 호출에서 다시 시도. */
let configPromise: Promise<UploadConfig> | null = null;
function uploadConfig(): Promise<UploadConfig> {
  configPromise ??= adminFetch<UploadConfig>("/uploads/config").catch((err) => {
    configPromise = null;
    throw err;
  });
  return configPromise;
}

/**
 * 파일 하나를 올리고 저장된 URL과 표시용 메타를 돌려준다.
 *
 * 서버가 로컬 디스크에 저장하는 배포에서는 예전처럼 API로 multipart POST를
 * 한다. 오브젝트 스토리지를 쓰는 배포에서는 브라우저가 스토리지로 직접
 * 올린다 — 서버리스 함수의 요청 바디 상한이 ~4.5MB라 25MB짜리 결의안 PDF가
 * 함수를 통과하지 못하기 때문이다. 어느 경로든 호출자가 보는 반환값은 같다.
 */
export async function uploadFile(file: File): Promise<SavedFile> {
  const type = uploadTypeOf(file.name);
  if (!type) {
    throw new ApiError(415, `Unsupported file type ${extensionOf(file.name) || "(none)"}`);
  }

  const config = await uploadConfig();
  // 서버의 허용 목록이 권위다. 위의 uploadTypeOf는 즉시 거르기 위한 것이고,
  // 서버가 목록을 좁히면 프론트 재배포 없이 여기서 걸린다.
  if (!config.extensions.includes(extensionOf(file.name))) {
    throw new ApiError(415, `Unsupported file type ${extensionOf(file.name) || "(none)"}`);
  }
  if (file.size > config.maxBytes) {
    throw new ApiError(
      413,
      `File exceeds ${humanSize(config.maxBytes)} (${humanSize(file.size)}).`,
    );
  }

  if (config.mode === "proxy") {
    const form = new FormData();
    form.append("file", file);
    return adminFetch("/uploads", { method: "POST", body: form });
  }

  // 스토리지 키는 브라우저가 만든다. crypto.randomUUID()는 보안 컨텍스트
  // 전용이라 (#30) @daemun/shared의 uuid()를 쓴다.
  let blob;
  try {
    blob = await upload(`${uuid()}${extensionOf(file.name)}`, file, {
      access: "public",
      contentType: type.mime,
      handleUploadUrl: "/api/admin/uploads/token",
    });
  } catch (err) {
    // upload()는 토큰 요청과 PUT을 스스로 하므로 adminFetch의 오류 규약을
    // 거치지 않는다. 화면이 다른 실패와 같은 방식으로 다루도록 ApiError로
    // 감싼다. 세션이 config를 받은 뒤에 만료된 좁은 경우엔 로그인
    // 리다이렉트 대신 이 메시지가 보인다.
    throw new ApiError(500, err instanceof Error ? err.message : "Upload failed.");
  }

  return {
    url: blob.url,
    originalName: file.name,
    kind: type.kind,
    bytes: file.size,
    size: humanSize(file.size),
  };
}
