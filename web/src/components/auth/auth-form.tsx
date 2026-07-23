"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthMascot, type MascotState } from "./auth-mascot";
import { LiquidGlassDefs } from "./liquid-glass-defs";

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
        className="w-full rounded-xl border border-white/10 bg-surface/60 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-secondary/60 placeholder:text-on-surface-variant/40"
      />
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [pwFocused, setPwFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  // Pointer-tracked highlight on the glass button — writes CSS vars directly to
  // the DOM (no React state/re-render) so it stays smooth on every mouse move.
  function handleBtnPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }
  function handleBtnPointerLeave(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.style.setProperty("--mx", "50%");
    e.currentTarget.style.setProperty("--my", "0%");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    // TODO(#9): swap for real Supabase auth; keep calling setShakeSignal(n => n + 1)
    // from that error path so the mascot shake stays wired to real failures.
    if (!email || password.length < 6) {
      setError(!email ? "E-posta gerekli." : "Şifre en az 6 karakter olmalı.");
      setShakeSignal((n) => n + 1);
      return;
    }
    setError(null);
  }

  return (
    <div className="w-full max-w-md">
      <LiquidGlassDefs />
      <div className="mb-4 flex justify-center">
        <AuthMascot state={mascotState} shakeSignal={shakeSignal} className="w-40" />
      </div>

      <div className="glass-card rounded-3xl p-7 sm:p-9">
        <h1 className="text-center font-display text-2xl font-semibold tracking-tight">
          {isSignup ? "Aramıza katıl" : "Tekrar hoş geldin"}
        </h1>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          {isSignup
            ? "Ücretsiz denemeyle yapay zekayı keşfetmeye başla."
            : "Öğrenci paneline giriş yap."}
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {isSignup && (
            <Field
              label="Ad Soyad"
              type="text"
              name="name"
              placeholder="Adın"
              autoComplete="name"
            />
          )}

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
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={() => error && setError(null)}
                className="w-full rounded-xl border border-white/10 bg-surface/60 px-4 py-3 pr-11 text-sm text-on-surface outline-none transition focus:border-secondary/60 placeholder:text-on-surface-variant/40"
              />
              <button
                type="button"
                // Without this, clicking the icon steals focus from the input first,
                // which blurs the field (mascot drops its hands) right before the
                // click toggles visibility — the exact "breaks on toggle" bug.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition hover:text-secondary-bright"
              >
                {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
          </div>

          <button
            type="submit"
            onPointerMove={handleBtnPointerMove}
            onPointerLeave={handleBtnPointerLeave}
            className="btn-glass mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 font-mono text-sm font-semibold"
          >
            {isSignup ? "Hesabımı Oluştur" : "Giriş Yap"}
            <ArrowRight className="size-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {isSignup ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
          <Link
            href={isSignup ? "/giris" : "/kayit"}
            className="font-medium text-secondary-bright hover:underline"
          >
            {isSignup ? "Giriş yap" : "Kayıt ol"}
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
