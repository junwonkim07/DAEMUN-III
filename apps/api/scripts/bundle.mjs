// Rolls the Hono app into one self-contained ES module for the Vercel
// function entry (api/[[...route]].mjs). Run as `pnpm bundle`; vercel.json
// uses it as the buildCommand. See the entry file for why bundling is needed.
import { rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });

const result = await build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/app.mjs",
  // pg's optional native binding. It is required lazily, and only when
  // something reads Client.native — nothing here does.
  external: ["pg-native"],
  // Bundled CommonJS dependencies that still call require() at runtime need
  // a real one; an ES module has none unless we make it.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
console.log(`[bundle] dist/app.mjs ${(bytes / 1024).toFixed(0)} KB`);
