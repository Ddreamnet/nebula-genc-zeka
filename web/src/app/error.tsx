"use client";

import { StatusPage } from "@/components/landing/status-page";
import { ContactCtas } from "@/components/landing/contact-ctas";
import { PaperButton } from "@/components/ui/paper-button";

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
      <PaperButton tone="amber" onClick={reset}>
        Tekrar dene
      </PaperButton>
      <PaperButton href="/" tone="paper">
        Ana sayfa
      </PaperButton>
      <ContactCtas variant="short" />
    </StatusPage>
  );
}
