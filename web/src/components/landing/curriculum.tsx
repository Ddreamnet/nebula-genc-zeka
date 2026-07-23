import { Wand2, Palette, Clapperboard, Gamepad2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const items = [
  {
    icon: Wand2,
    title: "Gelişmiş Prompting",
    desc: "Yapay zekaya doğru soruyu sormayı, karmaşık görevleri adım adım çözdürmeyi öğrenir.",
    tags: ["Başlangıç", "Strateji"],
  },
  {
    icon: Palette,
    title: "Görsel Üretimi",
    desc: "Hayal gücünü profesyonel araçlarla dijital sanata, poster ve karakterlere dönüştürür.",
    tags: ["Yaratıcılık", "Dijital Sanat"],
  },
  {
    icon: Clapperboard,
    title: "Video Prodüksiyonu",
    desc: "Senaryodan kurguya, yapay zekayla kısa filmler ve animasyonlar hazırlar.",
    tags: ["İleri Seviye", "Kurgu"],
  },
  {
    icon: Gamepad2,
    title: "Oyun & Etkileşim",
    desc: "Kendi mini oyununu ve etkileşimli projelerini tasarlayıp arkadaşlarıyla paylaşır.",
    tags: ["Proje", "Eğlence"],
  },
];

export function Curriculum() {
  return (
    <section
      id="mufredat"
      className="scroll-mt-24 border-y border-white/5 bg-surface-lowest/40 py-20 sm:py-28"
    >
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Müfredat</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Neler öğrenecek?
          </h2>
          <p className="mt-4 text-on-surface-variant">
            Tüketen değil, üreten bir nesil. Her modül gerçek bir çıktıyla biter.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={(i % 2) * 100}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-surface-container/60 p-7 transition duration-300 hover:border-secondary/30">
                <div className="absolute -right-16 -top-16 size-40 rounded-full bg-secondary/5 blur-2xl transition group-hover:bg-secondary/10" />
                <div className="relative">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/25 to-primary/15 text-secondary-bright">
                    <it.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    {it.title}
                  </h3>
                  <p className="mt-2.5 text-on-surface-variant">{it.desc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {it.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-wide text-on-surface-variant"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
