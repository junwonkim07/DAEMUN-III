// apps/admin/src/proxy.ts
//
// Next.js 16의 middleware.ts 후신. 여기서는 세션 쿠키 존재 여부만 낙관적으로
// 확인해서 /login으로 리다이렉트한다. 실제 인증·role·밴 여부 판단은 API의
// requireAdmin 미들웨어가 한다 (handover.md §7) — 이 파일은 절대 신뢰의
// 원천이 아니다.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const SESSION_COOKIE_SECURE = "__Secure-better-auth.session_token";

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(SESSION_COOKIE_SECURE);

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
