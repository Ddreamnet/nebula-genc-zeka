import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/lib/site";

const features = [
  "Haftada 2, ayda 8 canlı ders",
  "En fazla 2 kişilik özel sınıf",
  "Tüm premium yapay zeka araçları dahil",
  "Kişisel ilerleme paneli ve ders geçmişi",
  "Akademik katılım sertifikası",
];

export function Pricing() {
  return (
    <section id="fiyat" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Üyelik</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tek plan, tam erişim
          </h2>
          <p className="mt-4 text-on-surface-variant">
            Gizli ücret yok, taahhüt yok. İstediğiniz zaman iptal edin.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-md">
          <div className="glass-strong glow-amber relative overflow-hidden rounded-[2rem] border-2 border-secondary/40 p-8 sm:p-10">
            <div className="absolute right-6 top-6">
              <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-semibold text-on-secondary">
                EN POPÜLER
              </span>
            </div>
            <h3 className="font-display text-lg font-medium text-on-surface-variant">
              Aylık Üyelik
            </h3>
            <div className="mt-3 flex items-end gap-1.5">
              <span className="font-display text-5xl font-bold tracking-tight">
                {siteConfig.price.amount}
              </span>
              <span className="mb-1.5 text-lg text-on-surface-variant">
                {siteConfig.price.currency}/{siteConfig.price.period}
              </span>
            </div>

            <ul className="mt-8 space-y-3.5">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <Button href="/kayit" size="lg" className="mt-9 w-full">
              Ücretsiz Deneme Dersi Al
            </Button>
            <p className="mt-4 text-center text-xs text-on-surface-variant/70">
              Önce ücretsiz dene, sonra karar ver.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
