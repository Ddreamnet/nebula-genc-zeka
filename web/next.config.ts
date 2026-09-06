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
  // GoDaddy's build sandbox intermittently fails with ENOENT on a page's
  // .nft.json (e.g. the auto-generated _not-found route) during "Collecting
  // page data"/"Generating build traces" — that step runs across several
  // parallel workers (7 locally), and a constrained/slower sandbox
  // filesystem is the most likely place for a write-then-read race between
  // them to actually surface. Forcing a single worker serializes it away.
  // These steps are a small fraction of total build time either way, so the
  // slowdown here is negligible.
  experimental: {
    cpus: 1,
    // "radix-ui" is the all-in-one package re-exporting every Radix
    // primitive from one giant barrel file. Next optimizes known
    // barrel-heavy packages (lucide-react, date-fns, ...) by default, but
    // not this one — webpack otherwise has to pull in that whole barrel's
    // module graph just to resolve the handful of primitives we actually
    // import from it on any given page.
    optimizePackageImports: ["radix-ui"],
  },
  // `next build`'s own "Running TypeScript" pass (~25-35s) re-checks the
  // whole project with `tsc` in addition to compiling it — redundant with
  // running `tsc --noEmit` ourselves. Skipping it here buys back that time on
  // every GoDaddy build. This does NOT disable type-checking in the editor or
  // `tsc --noEmit` — only this specific redundant re-check during production
  // builds.
  //
  // The catch, learned the hard way: this trade is only safe if the separate
  // check is ACTUALLY run. It was not, and three real type errors sat in
  // app/api/playground/generate/route.ts for weeks — the route referenced a
  // table (`playground_generation_inputs`) whose migration had never been
  // applied, and nothing said so because the build could not fail.
  //
  // `npm run verify` (typecheck + lint) is now the one command that has to
  // pass before a deploy. Run it, or delete this block.
  typescript: {
    ignoreBuildErrors: true,
  },
  // `X-Powered-By: Next.js` on every response. It fingerprints the stack for
  // anyone scanning for framework-specific CVEs and buys nothing.
  poweredByHeader: false,
  // Trailing-slash URLs are a duplicate-content source: /eserler and
  // /eserler/ are two URLs serving one page. Next already 308s one to the
  // other; stating it here keeps that behaviour pinned to the version the
  // canonical tags were written against.
  trailingSlash: false,
  images: {
    // AVIF first, WebP behind it. next/image serves whichever the requesting
    // browser accepts, so the landing wordmark and the student work ship
    // ~30-50% smaller than the WebP-only default to every modern browser and
    // fall back cleanly on the ones that can't take it. Core Web Vitals is a
    // ranking signal and LCP is the one this moves.
    formats: ["image/avif", "image/webp"],
    // 31 days. The default is 4 hours (Next 16 raised it from 60s), which for
    // artwork that changes when a designer ships a new file means re-encoding
    // the same PNGs six times a day on a shared host.
    minimumCacheTTL: 2678400,
    // Everything under /public is authored by us; SVG is only ever served as
    // a static asset here, never optimized, so the sandbox flags stay off.
  },
  async redirects() {
    return [
      {
        // https://www.nebulagenczeka.com served the entire site with a 200,
        // not a redirect — verified live. Two hostnames, byte-identical pages:
        // Google sees one site twice, splits every link and engagement signal
        // between the two, and picks a canonical host itself. The canonical
        // tags all point at the bare domain, which mitigates it; a 308 is what
        // actually fixes it, and it also stops the www copy from ever being
        // crawled in the first place.
        source: "/:path*",
        has: [{ type: "host", value: "www.nebulagenczeka.com" }],
        destination: "https://nebulagenczeka.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Files under /public are served with no cache headers at all by
        // default, so the hero artwork, the brand lockups and the student
        // work are re-fetched on every navigation. These are content-addressed
        // by hand (a changed image gets a changed filename), so a year of
        // immutable caching is safe and removes them from the critical path
        // on every repeat visit.
        source: "/:dir(brand|landing|eserler)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Applies to every route. Referrer-Policy and the two below are
        // security headers rather than SEO ones, but Search Console's "page
        // experience" surfaces them and they cost nothing.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
