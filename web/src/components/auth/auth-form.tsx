"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthMascot, type MascotState } from "./auth-mascot";
import { useAuth } from "@/contexts/auth-context";
import { mapSupabaseError } from "@/lib/supabase/auth-errors";
import { whatsappHref } from "@/lib/site";
import { WhatsappIcon } from "@/components/ui/brand-icons";

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-outline-variant bg-surface-high px-4 py-3 text-base text-on-surface outline-none transition focus:border-secondary placeholder:text-on-surface-variant/50"
      />
    </div>
  );
}

export function AuthForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [pwFocused, setPwFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Navigating here via the homepage's "Giriş yap" link is a client-side
  // (App Router) transition. Next's own default scroll-restoration doesn't
  // just jump to (0,0) — it hunts for "the first scrollable top-level
  // element" of the new page and aligns that to the viewport, which in this
  // centered-card layout lands partway down instead of at the true top. That
  // adjustment runs after mount, so this has to win the race by running one
  // frame later, not in the same effect pass.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const mascotState: MascotState = pwFocused
    ? showPw
      ? "peeking"
      : "covering"
    : "idle";

  // React's onFocus/onBlur bubble like focusin/focusout, so this fires whenever
  // focus enters/leaves ANY descendant (input or the show/hide button) — not just
  // the input directly. Blur only counts as "left the field" if focus didn't just
  // move to another element inside the same wrapper (e.g. the eye-toggle button).
  function handlePwGroupBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setPwFocused(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email || password.length < 6) {
      setError(!email ? "E-posta gerekli." : "Şifre en az 6 karakter olmalı.");
      setShakeSignal((n) => n + 1);
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(mapSupabaseError(signInError));
      setShakeSignal((n) => n + 1);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 flex justify-center">
        <AuthMascot state={mascotState} shakeSignal={shakeSignal} className="w-40" />
      </div>

      <div className="pn-card rounded-3xl p-7 sm:p-9">
        <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-on-surface">
          Tekrar hoş geldin
        </h1>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Öğrenci paneline giriş yap.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <Field
            label="E-posta"
            type="email"
            name="email"
            placeholder="ornek@eposta.com"
            autoComplete="email"
            onChange={() => error && setError(null)}
          />

          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-on-surface-variant">
              Şifre
            </label>
            <div
              className="relative"
              onFocus={() => setPwFocused(true)}
              onBlur={handlePwGroupBlur}
            >
              <input
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                onChange={() => error && setError(null)}
                className="w-full rounded-xl border border-outline-variant bg-surface-high px-4 py-3 pr-11 text-base text-on-surface outline-none transition focus:border-secondary placeholder:text-on-surface-variant/50"
              />
              <button
                type="button"
                // Without this, clicking the icon steals focus from the input first,
                // which blurs the field (mascot drops its hands) right before the
                // click toggles visibility — the exact "breaks on toggle" bug.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-on-surface-variant transition hover:text-secondary-bright"
              >
                {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
          </div>

          <button type="submit" disabled={submitting} className="pn-btn pn-btn--amber mt-2 w-full text-sm">
            {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            <ArrowRight className="size-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Hesabın yok mu?{" "}
          <Link
            href={whatsappHref()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 align-middle font-medium text-[#25D366] hover:underline"
          >
            <WhatsappIcon className="size-4" />
            WhatsApp&apos;tan yaz
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-xs text-on-surface-variant/60">
        Devam ederek{" "}
        <Link href="/kvkk" className="underline hover:text-on-surface-variant">
          KVKK
        </Link>{" "}
        ve{" "}
        <Link href="/gizlilik" className="underline hover:text-on-surface-variant">
          gizlilik
        </Link>{" "}
        şartlarını kabul edersin.
      </p>
    </div>
  );
}
