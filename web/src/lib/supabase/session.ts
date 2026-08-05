import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];
const AUTH_PATHS = ["/giris"];

/**
 * Runs on every request via src/proxy.ts. Two jobs:
 *  1. Refresh the auth token (Server Components can't write cookies during
 *     render, so this is the only place a near-expiry session gets renewed).
 *  2. Optimistic redirect based on cookie presence only — no DB round-trip.
 *     Role-based branching happens one layer in, in dashboard/page.tsx.
 *
 * `isAuthed` only ever feeds the two redirects below, so paths outside
 * PROTECTED_PATHS/AUTH_PATHS have no use for it — skip the Supabase round
 * trip entirely there. The matcher in proxy.ts covers nearly every request
 * (landing/blog pages, and every /api/playground/* poll tick during video
 * generation), so this used to pay a full getClaims() call for a result
 * nothing ever read. Every route that actually needs auth does its own
 * check downstream anyway (dashboard/page.tsx, playground/page.tsx, and the
 * API routes all call getUser()/getClaims() themselves and can refresh
 * cookies directly from a Route Handler), so this doesn't weaken session
 * refresh anywhere that matters.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuthCheck =
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) || AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (!needsAuthCheck) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
