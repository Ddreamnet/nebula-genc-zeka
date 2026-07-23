"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

const faqs = [
  {
    q: "Eğitim için ön bilgi gerekli mi?",
    a: "Hayır. Program sıfırdan başlar; çocuğunuzun meraklı olması ve temel bilgisayar kullanabilmesi yeterli.",
  },
  {
    q: "Dersler nasıl işleniyor?",
    a: "Canlı, kameralı ve en fazla 2 kişilik gruplarla. Her ders bir uzman eğitmen eşliğinde, gerçek bir üretimle sonuçlanır.",
  },
  {
    q: "Ders kaçırılırsa ne olur?",
    a: "Tüm dersler kayıt altına alınır. Kaçırılan ders panelden izlenebilir, eğitmene dilediğiniz zaman soru sorulabilir.",
  },
  {
    q: "Hangi yapay zeka araçları kullanılıyor?",
    a: "Yaşa uygun, filtreli ve güvenli araçlar. Tüm premium araçlar üyeliğe dahildir; ayrıca ücret ödemezsiniz.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Evet. Üyelik esnektir, taahhüt yoktur; dilediğiniz an iptal edebilirsiniz.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="sss" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">SSS</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Sıkça sorulan sorular
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className="overflow-hidden rounded-2xl border border-white/8 bg-surface-container/50"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-secondary transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-on-surface-variant">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
