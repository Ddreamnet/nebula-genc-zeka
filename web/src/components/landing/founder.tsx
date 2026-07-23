import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/lib/site";

export function Founder() {
  return (
    <section id="kurucu" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal>
          <figure className="glass mx-auto max-w-3xl rounded-[2rem] border border-white/8 p-8 text-center sm:p-12">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary font-display text-2xl font-bold text-on-secondary ring-4 ring-white/5">
              FB
            </div>
            <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed text-on-surface sm:text-2xl">
              &ldquo;Hayalimiz net: çocuklar teknolojiyi sadece tüketen değil,
              yönlendiren bireyler olsun. Nebula&apos;da sadece kod değil, gelecek inşa
              ediyoruz.&rdquo;
            </blockquote>
            <figcaption className="mt-6">
              <div className="font-semibold">{siteConfig.founder}</div>
              <div className="font-mono text-sm text-secondary">
                Kurucu &amp; Eğitim Vizyoneri
              </div>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
