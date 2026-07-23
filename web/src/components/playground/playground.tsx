"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Sparkles, ArrowLeft, Lock, Zap } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/cn";

const FREE_LIMIT = 5;

const EXAMPLES = [
  "Uzayda kaykay yapan bir kedi hayal et 🛹🐱",
  "Bana kısa bir uzay macerası yaz",
  "Kara delikleri 10 yaşındaki birine anlat",
  "Robotlar rüya görür mü?",
];

type Msg = { role: "user" | "assistant"; content: string };

/** Progressive text reveal to mimic token streaming (real Claude wiring in #10). */
function streamInto(full: string, onUpdate: (s: string) => void) {
  return new Promise<void>((resolve) => {
    let i = 0;
    const step = () => {
      i += Math.max(2, Math.round(full.length / 70));
      onUpdate(full.slice(0, i));
      if (i < full.length) setTimeout(step, 22);
      else resolve();
    };
    step();
  });
}

function mockAnswer(q: string): string {
  const t = q.toLocaleLowerCase("tr");
  if (t.includes("kedi") || t.includes("çiz") || t.includes("görsel")) {
    return "Harika fikir! 🎨 Şöyle hayal ediyorum: koyu lacivert bir galakside, minik bir uzay giysili kedi bir kaykayın üstünde yıldızların arasında süzülüyor. Kuyruğu bir kuyruklu yıldız gibi ışık saçıyor, gözlerinde iki küçük gezegen yansıyor.\n\n(Bu bir önizleme yanıtıdır — gerçek görsel üretimi derslerde profesyonel araçlarla yapılıyor.)";
  }
  if (t.includes("şiir") || t.includes("macera") || t.includes("hikaye") || t.includes("yaz")) {
    return "Küçük bir mucit, roketini yıldız tozundan yaptı,\nDüğmeye bastı, gökyüzü kucak açtı.\nHer soru bir kıvılcım, her fikir bir yörünge —\nMeraklı olan çocuk, evreni çözer sonunda. ✨";
  }
  if (t.includes("kara delik") || t.includes("uzay") || t.includes("gezegen")) {
    return "Kara deliği dev bir uzay süpürgesi gibi düşün: o kadar güçlü çekiyor ki ışık bile kaçamıyor! Ama korkma — en yakın kara delik bize inanılmaz uzakta. Bilim insanları onları, etraflarındaki dönen sıcak gazın parıltısından anlıyor. 🌌";
  }
  return "Süper bir soru! Nebula'da böyle merakları birlikte keşfediyoruz: fikri parçalara ayırıyor, yapay zekaya doğru soruları sorup gerçek bir şey üretiyoruz. Sen ne yaratmak istersin — bir görsel mi, bir hikâye mi, yoksa küçük bir oyun mu? 🚀";
}

export function Playground() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, FREE_LIMIT - used);
  const gated = remaining <= 0;
  const empty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || gated) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setUsed((u) => u + 1);
    await streamInto(mockAnswer(q), (chunk) => {
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "assistant", content: chunk };
        return copy;
      });
    });
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Logo showText={false} />
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-surface-high/60 px-3 py-1.5 text-on-surface-variant">
              <Zap className="size-3.5 text-secondary" />
              {remaining}/{FREE_LIMIT} ücretsiz
            </span>
            <Link
              href="/giris"
              className="rounded-full bg-secondary px-4 py-1.5 font-semibold text-on-secondary transition hover:brightness-110"
            >
              Giriş yap
            </Link>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
              <Sparkles className="size-7" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
              Nebula Playground
            </h1>
            <p className="mt-3 max-w-md text-on-surface-variant">
              Bir fikir yaz, yapay zekayla birlikte keşfet. Kaydolmadan {FREE_LIMIT} ücretsiz
              deneme hakkın var.
            </p>
            <div className="mt-8 grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-2xl border border-white/8 bg-surface-container/60 px-4 py-3 text-left text-sm text-on-surface-variant transition hover:border-secondary/30 hover:text-on-surface"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <Bubble key={i} msg={m} busy={busy && i === messages.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-white/5 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          {gated ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-secondary/25 bg-secondary/8 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <Lock className="size-5" />
                </span>
                <p className="text-sm text-on-surface-variant">
                  Ücretsiz deneme hakkın bitti. Öğrenci olarak çok daha fazlasını üret!
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href="/giris"
                  className="rounded-full border border-white/10 px-4 py-2 font-mono text-sm text-on-surface transition hover:border-secondary/40"
                >
                  Giriş
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-full bg-secondary px-4 py-2 font-mono text-sm font-semibold text-on-secondary transition hover:brightness-110"
                >
                  Kayıt ol
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-white/10 bg-surface-container/60 p-2 focus-within:border-secondary/50"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Bir şeyler hayal et..."
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Gönder"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          )}
          <p className="mt-2 text-center font-mono text-[11px] text-on-surface-variant/50">
            Önizleme • gerçek yapay zeka yakında bağlanacak
          </p>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, busy }: { msg: Msg; busy: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-secondary/15 text-secondary-bright"
            : "rounded-bl-sm border border-white/8 bg-surface-high/50 text-on-surface",
        )}
      >
        {msg.content || (busy && <TypingDots />)}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="size-1.5 animate-pulse rounded-full bg-on-surface-variant/60" />
      <span className="size-1.5 animate-pulse rounded-full bg-on-surface-variant/60 [animation-delay:150ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-on-surface-variant/60 [animation-delay:300ms]" />
    </span>
  );
}
