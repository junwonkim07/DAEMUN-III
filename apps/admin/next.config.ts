import path from "node:path";
import type { NextConfig } from "next";

// 세션 쿠키가 admin 도메인의 first-party 쿠키가 되려면 /api/*, /uploads/*를
// 브라우저 입장에서 same-origin으로 보이게 API 서버로 프록시해야 한다.
// (handover.md §3 — 이거 없으면 로그인 자체가 CSRF/쿠키 문제로 막힌다)
//
// 주의: rewrites()는 `next build` 시점에 한 번 평가되어 routes-manifest에
// 고정된다. 즉 API_URL은 **빌드 시** 환경변수다 — Vercel 프로젝트(daemun-admin)
// 환경변수로 넣어야 하고, 런타임 environment로는 바꿀 수 없다.
// 프로덕션 빌드에서 빠뜨리면 rewrite가 localhost를 가리킨 채 배포되고 로그인이
// 전부 403이 난다 (handover.md §3). 그때 가서 알기보다 빌드에서 막는다.
if (process.env.NODE_ENV === "production" && !process.env.API_URL) {
  throw new Error("API_URL must be set for a production build (it is baked into rewrites)");
}
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // 자체 호스팅(장수 `node server.js`) 전용. Vercel에선 건너뛴다 — 그쪽 빌더가
  // 자체 트레이싱을 하는데 워크스페이스의 standalone 출력에서 실패한다.
  ...(process.env.VERCEL
    ? {}
    : { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "../..") }),
  transpilePackages: ["@daemun/shared"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
