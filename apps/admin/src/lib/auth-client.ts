// apps/admin/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/**
 * next.config.ts가 /api/*를 API 서버로 rewrite하므로 baseURL은 그냥
 * same-origin("")으로 둔다 — 브라우저 기준 쿠키가 admin 도메인의
 * first-party 쿠키가 된다 (handover.md §3).
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signOut, useSession } = authClient;
