/**
 * Environment variables, read where they are used and checked by name.
 *
 * These used to be read inline as `process.env.NEXT_PUBLIC_SUPABASE_URL!` —
 * the non-null assertion is a compile-time promise TypeScript cannot keep at
 * runtime. With the variable missing, `createBrowserClient(undefined, undefined)`
 * throws somewhere deep inside @supabase/ssr, and what reaches the user is a
 * blank page plus a stack trace that names neither the variable nor the file.
 * Naming the variable is the whole point of this module.
 *
 * ---- Why these are FUNCTIONS and not `export const` ----------------------
 *
 * They were consts at first, evaluated at module scope. That broke the
 * production build outright: `next build`'s "Collecting page data" step
 * imports every route module, every Supabase-touching route imports this
 * file, and a host that supplies its variables to the running server but not
 * to the build step then fails the build with
 *
 *     Failed to collect page data for /api/admin/playground-treasury
 *
 * naming a route that has nothing to do with it — it is merely the first one
 * imported. Reading inside a function moves the check to the first real use,
 * which is where a missing variable actually matters and where the message
 * can be read by whoever hit it.
 *
 * ---- Why `process.env.X` is written out literally ------------------------
 *
 * Next replaces `process.env.NEXT_PUBLIC_*` with the literal value when it
 * compiles the browser bundle, and it can only do that for a static member
 * expression. Reading `process.env[name]` through the `name` parameter would
 * compile to a lookup that is always undefined in the browser, so the name
 * is passed separately purely for the error message.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Eksik ortam değişkeni: ${name}. ` +
        `Yerel geliştirme için web/.env.local dosyasına, canlıda hosting panelindeki environment ayarlarına ekleyin (bkz. web/.env.example). ` +
        `NEXT_PUBLIC_ ile başlayan değişkenler tarayıcı paketine derleme sırasında gömülür — hosting panelinde bunları derleme adımına da vermek gerekir.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
