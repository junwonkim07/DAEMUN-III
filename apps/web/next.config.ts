import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Baked into the rewrites below at build time. A production build that
// forgot to set it would ship rewrites pointing at localhost and fail only
// once a visitor tried to sign in — make it fail the build instead. The
// Docker image passes it as a build ARG; a hosted build sets it in the
// project's environment.
if (process.env.NODE_ENV === "production" && !process.env.API_URL) {
  throw new Error("API_URL must be set for a production build (it is baked into rewrites)");
}
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Docker: emit a self-contained server (see apps/web/Dockerfile). Docker-only:
  // Vercel's builder does its own tracing and fails on standalone output in a
  // workspace (it looks for .next/next-server.js.nft.json, which standalone
  // mode never writes).
  ...(process.env.VERCEL
    ? {}
    : { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "../..") }),
  // Workspace packages are shipped as TypeScript source
  transpilePackages: ["@daemun/shared"],
  // Admin-uploaded photos (secretariat, committee images) render through
  // next/image. With the local storage driver they are same-origin /uploads
  // paths; with object storage they are absolute URLs on the store's host,
  // which next/image refuses unless the host is allow-listed here.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // Files uploaded through the admin API live on the API server; proxy them
  // so the public site can reference them as same-origin paths.
  //
  // /api/auth/* is proxied too so better-auth's session cookie is a
  // first-party cookie of this site (same trick as the admin panel — see
  // handover.md §3). Rewrites are fixed at build time, so API_URL is a build
  // ARG in Docker. /api/revalidate is a local route and is not affected.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
      { source: "/api/auth/:path*", destination: `${API_URL}/api/auth/:path*` },
      // 안내 챗봇 — 브라우저에서 same-origin으로 호출, API의 공개 엔드포인트로 전달
      { source: "/api/chat", destination: `${API_URL}/api/public/chat` },
    ];
  },
};

const withMDX = createMDX({
  options: {
    // string form keeps the config serializable for Turbopack
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
