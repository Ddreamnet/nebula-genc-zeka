import { UserPlus, Radio, Rocket } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    n: "01",
    icon: UserPlus,
    title: "Kayıt Ol",
    desc: "Kısa bir formla başla; çocuğunun seviyesine en uygun gruba biz yerleştirelim.",
  },
  {
    n: "02",
    icon: Radio,
    title: "Canlı Derse Katıl",
    desc: "Uzman eğitmen ve en fazla bir sınıf arkadaşıyla interaktif, kameralı sınıfa bağlan.",
  },
  {
    n: "03",
    icon: Rocket,
    title: "Üretmeye Başla",
    desc: "Teoriyle vakit kaybetme — daha ilk günden kendi görselini, videonu, oyununu üret.",
  },
];

export function HowItWorks() {
  return (
    <section id="nasil" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Nasıl Çalışır</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Üç adımda uzaya çıkış
          </h2>
          <p className="mt-4 text-on-surface-variant">
            Karmaşık kurulum yok. Kaydından ilk üretimine kadar her şey basit.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="group relative h-full rounded-3xl border border-white/8 bg-surface-container/60 p-7 transition duration-300 hover:border-secondary/30 hover:bg-surface-high/40">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-secondary/12 text-secondary transition group-hover:bg-secondary/20">
                    <s.icon className="size-6" />
                  </span>
                  <span className="font-mono text-2xl font-semibold text-white/10">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2.5 text-on-surface-variant">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
