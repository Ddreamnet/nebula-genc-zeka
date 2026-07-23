import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function ClosingCta() {
  return (
    <section className="pb-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-secondary/30 bg-gradient-to-br from-secondary/25 via-surface-high to-primary/15 p-10 text-center sm:p-16">
            <div className="absolute inset-0 starfield opacity-30" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Geleceğin dilini bugün öğrenin
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-on-surface-variant">
                Kontenjanlar sınırlı. Çocuğunuzun yerini ücretsiz deneme dersiyle
                ayırtın.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/kayit" size="lg">
                  Başvurunuzu Yapın <ArrowRight className="size-4" />
                </Button>
                <Button href="/playground" variant="soft" size="lg">
                  Önce Playground&apos;ı Dene
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
