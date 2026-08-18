"use client";

import Link from "next/link";
import { StatusPage } from "@/components/landing/status-page";
import { ContactCtas } from "@/components/landing/contact-ctas";

/**
 * Route-level error boundary for everything under the root layout. `reset()`
 * re-renders the failed segment without a full page reload, which is the right
 * first move for the transient case (a Supabase call that timed out); the link
 * home is the escape hatch when it isn't transient.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      code="BİR ŞEYLER TERS GİTTİ"
      title="Bu sayfayı açamadık."
      message="Geçici bir aksaklık olabilir. Tekrar denemek çoğu zaman yeterli oluyor; olmazsa bize yazın, hemen bakalım."
    >
      <button type="button" onClick={reset} className="nl-btn nl-btn--lg nl-btn--amber inline-flex">
        Tekrar dene
      </button>
      <Link href="/" className="nl-btn nl-btn--lg nl-btn--outline-dark inline-flex" style={{ color: "var(--navy)", borderColor: "rgba(21,35,67,.32)" }}>
        Ana sayfa
      </Link>
      <ContactCtas iconOnly />
    </StatusPage>
  );
}
