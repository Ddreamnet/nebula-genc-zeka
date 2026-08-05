import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generic Node.js hosting (no CDN/serverless split) needs a single
  // self-contained server it can just `node server.js` — standalone output
  // traces only the deps each route actually needs into .next/standalone
  // and emits a server.js there that already reads PORT/HOSTNAME from env,
  // reusing the exact same request handler `next start` uses (so proxy.ts
  // and every API route keep working identically, unlike a hand-rolled
  // custom server).
  output: "standalone",
};

export default nextConfig;
