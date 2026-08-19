import type { Metadata } from "next";
import { StatusPage } from "@/components/landing/status-page";
import { ContactCtas } from "@/components/landing/contact-ctas";
import { PaperButton } from "@/components/ui/paper-button";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  // A 404 that gets indexed is worse than one that doesn't exist.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <StatusPage
      code="404 — SAYFA YOK"
      title="Bu sayfa uzayda kaybolmuş."
      message="Aradığınız adres taşınmış ya da hiç var olmamış olabilir. Ana sayfadan devam edebilir, ya da ne aradığınızı bize doğrudan yazabilirsiniz."
    >
      <PaperButton href="/" tone="amber">
        Ana sayfaya dön
      </PaperButton>
      <ContactCtas variant="short" />
    </StatusPage>
  );
}
