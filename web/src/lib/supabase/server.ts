import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseUrl, supabasePublishableKey } from "@/lib/env";

/** For Server Components / Route Handlers. Reads only in Server Components (writes are a no-op there — proxy.ts refreshes the session cookie instead). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written. Harmless as long as proxy.ts is refreshing sessions.
          }
        },
      },
    },
  );
}
