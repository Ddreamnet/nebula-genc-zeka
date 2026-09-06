/**
 * Environment variables, read once and checked.
 *
 * These used to be read inline as `process.env.NEXT_PUBLIC_SUPABASE_URL!` —
 * the non-null assertion is a compile-time promise TypeScript cannot keep at
 * runtime. With the variable missing, `createBrowserClient(undefined, undefined)`
 * throws somewhere deep inside @supabase/ssr, and what reaches the user is a
 * blank page plus a stack trace that names neither the variable nor the file.
 *
 * Failing here instead names the exact variable, and fails on the first import
 * rather than on the first query.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Eksik ortam değişkeni: ${name}. ` +
        `Yerel geliştirme için web/.env.local dosyasına, canlıda hosting panelindeki environment ayarlarına ekleyin (bkz. web/.env.example).`,
    );
  }
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
