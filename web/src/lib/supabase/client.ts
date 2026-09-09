import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseUrl, supabasePublishableKey } from "@/lib/env";

/** For Client Components. `createBrowserClient` is memoized internally — safe to call repeatedly. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
