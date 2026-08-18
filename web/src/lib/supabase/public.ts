import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cookie-free Supabase client for genuinely public, anonymous reads (the
 * sitemap). The cookie-bound `server.ts` client would work too, but calling
 * `cookies()` opts the caller into dynamic rendering — pointless for a file
 * whose content doesn't vary per visitor, and it makes the sitemap re-query
 * on every crawler hit instead of being cacheable.
 *
 * Carries the publishable (anon) key, so RLS still applies: it can only see
 * what an anonymous visitor could already see.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
