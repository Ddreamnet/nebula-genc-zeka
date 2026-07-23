import { ArrowRight, Sparkles, Send } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function PlaygroundTeaser() {
  return (
    <section id="playground" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/8 p-6 sm:p-10">
            <div className="absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="eyebrow">Playground</span>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Anlatmak yerine <span className="text-gradient-cosmic">denet.</span>
                </h2>
                <p className="mt-4 max-w-md text-on-surface-variant">
                  Kaydolmadan da yapay zekayı hemen dene. Bir fikir yaz, Nebula ona
                  görsel bir dünya kursun. Öğrenciler giriş yapınca çok daha fazlasını
                  üretebiliyor.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button href="/playground" size="lg">
                    Playground&apos;a Git <ArrowRight className="size-4" />
                  </Button>
                  <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                    <Sparkles className="size-4 text-secondary" /> Ücretsiz birkaç deneme
                    hakkı
                  </span>
                </div>
              </div>

              {/* Faux chat preview */}
              <div className="rounded-2xl border border-white/8 bg-surface/60 p-4 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <span className="size-2.5 rounded-full bg-red-400/70" />
                  <span className="size-2.5 rounded-full bg-yellow-400/70" />
                  <span className="size-2.5 rounded-full bg-green-400/70" />
                  <span className="ml-2 font-mono text-xs text-on-surface-variant">
                    nebula · playground
                  </span>
                </div>
                <div className="space-y-3 py-4">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-secondary/15 px-4 py-2.5 text-sm text-secondary-bright">
                    Uzayda kaykay yapan bir kedi hayal et 🛹🐱
                  </div>
                  <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-high/70 px-4 py-2.5 text-sm text-on-surface-variant">
                    Harika fikir! İşte galaksinin en havalı kedisi — yıldızların arasında
                    süzülüyor, kuyruğu bir kuyruklu yıldız gibi parlıyor...
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                    <span className="size-1.5 animate-pulse rounded-full bg-secondary" />{" "}
                    üretiliyor
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/8 bg-surface px-4 py-2.5">
                  <input
                    disabled
                    placeholder="Bir şeyler hayal et..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/50"
                  />
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-on-secondary">
                    <Send className="size-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
