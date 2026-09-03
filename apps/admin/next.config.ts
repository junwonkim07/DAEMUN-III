import path from "node:path";
import type { NextConfig } from "next";

// 세션 쿠키가 admin 도메인의 first-party 쿠키가 되려면 /api/*, /uploads/*를
// 브라우저 입장에서 same-origin으로 보이게 API 서버로 프록시해야 한다.
// (handover.md §3 — 이거 없으면 로그인 자체가 CSRF/쿠키 문제로 막힌다)
//
// 주의: rewrites()는 `next build` 시점에 한 번 평가되어 routes-manifest에
// 고정된다. 즉 API_URL은 **빌드 시** 환경변수다 — Docker에서는 build ARG로
// 넘겨야 하고, 런타임 environment로는 바꿀 수 없다 (apps/admin/Dockerfile 참고).
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@daemun/shared"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
