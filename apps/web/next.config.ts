import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Docker: emit a self-contained server (see apps/web/Dockerfile)
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Workspace packages are shipped as TypeScript source
  transpilePackages: ["@daemun/shared"],
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
      { source: "/api/presence", destination: `${API_URL}/api/public/presence` },
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
