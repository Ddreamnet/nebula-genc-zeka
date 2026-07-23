import { ArrowRight, Sparkles, Radio, Users, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Astronaut } from "@/components/site/astronaut";
import { siteConfig } from "@/lib/site";

const chips = [
  { icon: Radio, label: "Canlı ders" },
  { icon: Users, label: "En fazla 2 kişilik grup" },
  { icon: ShieldCheck, label: "Denetimli ortam" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide text-secondary-bright">
              <Sparkles className="size-3.5" /> {siteConfig.ageRange} · Yapay Zeka Akademisi
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
              Çocuğunuz yapay zekayı{" "}
              <span className="text-gradient-amber">izlemesin,</span> kullansın.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-on-surface-variant lg:mx-0">
              10–16 yaş için canlı, uygulamalı yapay zeka eğitimi. En fazla 2 kişilik
              gruplar, her derste ekrana çıkan gerçek bir üretim — prompt&apos;tan görsele,
              videodan oyuna.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button href="/kayit" size="lg">
                Ücretsiz Deneme Dersi <ArrowRight className="size-4" />
              </Button>
              <Button href="/playground" variant="ghost" size="lg">
                Playground&apos;ı Dene
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {chips.map((c) => (
                <li
                  key={c.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-surface-high/50 px-3.5 py-2 text-sm text-on-surface-variant"
                >
                  <c.icon className="size-4 text-secondary" /> {c.label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Astronaut visual */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-full bg-secondary/10 blur-3xl animate-pulse-glow" />
            <div className="absolute inset-4 rounded-full border border-white/5" />
            <div className="absolute inset-12 rounded-full border border-white/5" />
            <Astronaut className="absolute inset-0 m-auto w-2/3 animate-float [filter:drop-shadow(0_24px_44px_rgba(0,0,0,0.5))]" />
            <div className="absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-spin-slow">
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_12px_2px_rgba(255,182,143,0.7)]" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
