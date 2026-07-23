import { ShieldCheck, Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const points = [
  "Tüm dersler kayıt altına alınır, istediğiniz an izlenebilir",
  "Eğitmenler pedagojik yaklaşıma sahip ve çocuk odaklı",
  "Yaşa uygun, filtreli ve denetimli yapay zeka araçları",
  "Şeffaf ilerleme raporları ve düzenli veli bilgilendirmesi",
];

export function Safety() {
  return (
    <section id="guvenlik" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[2rem] border border-secondary/15 p-8 sm:p-12">
            <div className="absolute -left-20 -top-20 size-56 rounded-full bg-secondary/10 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                  <ShieldCheck className="size-7" />
                </span>
                <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ebeveyn güveni önce gelir
                </h2>
                <p className="mt-4 max-w-md text-on-surface-variant">
                  Nebula&apos;da çocuğunuzun güvenliği ve gelişimi her şeyin önünde.
                  Teknolojiyi güvenli bir çerçevede, yanında bir uzmanla keşfeder.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 rounded-2xl border border-white/8 bg-surface/40 p-4"
                  >
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="size-4" />
                    </span>
                    <span className="text-sm text-on-surface-variant">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
