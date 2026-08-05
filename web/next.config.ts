import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Generic Node.js hosting (no CDN/serverless split) needs a single
  // self-contained server it can just `node server.js` — standalone output
  // traces only the deps each route actually needs into .next/standalone
  // and emits a server.js there that already reads PORT/HOSTNAME from env,
  // reusing the exact same request handler `next start` uses (so proxy.ts
  // and every API route keep working identically, unlike a hand-rolled
  // custom server).
  output: "standalone",
  // The repo root has its own (dependency-free) package.json so hosts that
  // require package.json at the repo root can find one — Next's tracing
  // otherwise auto-detects THAT as the monorepo root the moment a lockfile
  // exists up there too (any `npm install` run from repo root creates one,
  // even with zero deps), which nests the whole standalone output one
  // level deeper (`standalone/web/server.js` instead of
  // `standalone/server.js`) and silently breaks the start script's path.
  // Pinning this to `web/` itself removes the ambiguity regardless of what
  // shows up above it.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
