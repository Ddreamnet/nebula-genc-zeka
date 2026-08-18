"use client";

/**
 * Panel-side error boundary. Deliberately does NOT reuse the marketing
 * StatusPage: this route group runs on Nebula's dark panel palette, and
 * dropping a paper-coloured page into the middle of the dashboard would read
 * as a different product. Matches dashboard/loading.tsx's shell instead.
 */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel-theme flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface px-6 text-center">
      <div>
        <h1 className="font-display text-xl font-semibold text-on-surface">Paneli açamadık</h1>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
          Bağlantı geçici olarak kopmuş olabilir. Tekrar denemek genelde yeterli oluyor.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="pn-btn pn-btn--sm pn-btn--amber">
          Tekrar dene
        </button>
        <a href="/giris" className="pn-btn pn-btn--sm">
          Giriş sayfası
        </a>
      </div>
    </div>
  );
}
