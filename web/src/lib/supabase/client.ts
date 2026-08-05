import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** For Client Components. `createBrowserClient` is memoized internally — safe to call repeatedly. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
