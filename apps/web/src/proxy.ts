// Next.js 16's successor to middleware.ts.
//
// Optimistic route protection only: if there is no session cookie at all,
// bounce to /login. The API is the source of truth for whether the session
// is valid — pages under /account re-check with useSession() on the client.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const SESSION_COOKIE_SECURE = "__Secure-better-auth.session_token";

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(SESSION_COOKIE_SECURE);

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/account/:path*"],
};
