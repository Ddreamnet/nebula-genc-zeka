"use client";

import { useState } from "react";
import { ChevronRight, Dices, Info, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import type { PlaygroundTool } from "@/lib/playground/tools";
import { studioFields, type Role, type StudioField, type StudioParams } from "@/lib/playground/params";
import { paramDoc } from "@/lib/playground/param-docs";

/**
 * "Gelişmiş" — the studio dials, drawn from the model rather than from a list.
 *
 * Nothing here is hand-enumerated: `studioFields` reads the model's live
 * capability record and the caller's role and hands back the dials that exist.
 * Sora shows no seed because Sora has none; FLUX shows a file-format picker
 * because FLUX is the one live image model that offers one. A dial a student
 * can see is a dial the server will honour, and vice versa.
 *
 * Two layers, the same pattern the recipe cards already use: the four or five
 * settings that answer "what am I making" open with the panel, and the rest
 * sit behind "Daha fazla" so a ten-year-old is not handed twenty sliders.
 *
 * The section starts OPEN: a collapsed "Gelişmiş" row at the bottom of the
 * panel read as a locked door, and the dials are the reason the panel exists.
 * It can still be folded away for the session.
 */
export function StudioPanel({
  tool,
  role,
  params,
  onChange,
  onReset,
  changed,
  disabled,
  costLine,
  atCeiling,
}: {
  tool: PlaygroundTool;
  role: Role;
  params: StudioParams;
  onChange: (key: string, value: StudioParams[string]) => void;
  onReset: () => void;
  /** How many dials sit off their default — drives the header count. */
  changed: number;
  disabled: boolean;
  /** "8 sn · 1080p · sesli — 24 cevher", recomputed on every dial move. */
  costLine: string | null;
  /** These dials are past the per-generation ceiling; the send is refused. */
  atCeiling: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const fields = studioFields(tool, role);
  const core = fields.filter((f) => f.tier === "core");
  const more = fields.filter((f) => f.tier === "more");

  return (
    <section className="flex flex-col gap-2 border-t border-[color:var(--pn-hair)] pt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="pg-section-title flex-1">Gelişmiş</span>
        {changed > 0 && <span className="pn-tag pn-tag--quiet font-mono">{changed}</span>}
        <ChevronRight className={cn("size-4 text-on-surface-variant transition-transform duration-[.18s]", open && "rotate-90")} aria-hidden />
      </button>

      <div className="pn-expand" data-open={open} inert={!open}>
        <div>
        <div className="flex flex-col gap-3 pt-1">
          {fields.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-on-surface-variant">Bu modelin ayarlanabilir bir kadranı yok — yalnız yazdığın tarifle çalışıyor.</p>
          ) : (
            <>
              {core.map((field) => (
                <Dial key={field.key} field={field} role={role} value={params[field.key]} onChange={onChange} disabled={disabled} />
              ))}

              {more.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    aria-expanded={moreOpen}
                    className="flex items-center gap-1.5 self-start text-[11px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    <ChevronRight className={cn("size-3.5 transition-transform duration-[.18s]", moreOpen && "rotate-90")} aria-hidden />
                    Daha fazla ({more.length})
                  </button>
                  <div className="pn-expand" data-open={moreOpen} inert={!moreOpen}>
                    <div>
                      <div className="flex flex-col gap-3">
                        {more.map((field) => (
                          <Dial key={field.key} field={field} role={role} value={params[field.key]} onChange={onChange} disabled={disabled} />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* The economics lesson: the price moves while the dial does. */}
              {costLine && (
                <p
                  className={cn(
                    "rounded-[10px] px-2.5 py-2 font-mono text-[11px] font-semibold",
                    atCeiling ? "bg-[color:var(--pn-pink-tint)] text-[color:var(--pn-pink-ink-strong)]" : "bg-[color:var(--pn-peach-tint)] text-[color:var(--pn-peach-ink)]",
                  )}
                >
                  {costLine}
                  {atCeiling && (
                    <span className="mt-1 block font-sans font-normal">
                      Bu ayarlar tek üretim sınırını aşıyor. Süreyi ya da çözünürlüğü düşürmeden gönderemezsin.
                    </span>
                  )}
                </p>
              )}

              <button type="button" onClick={onReset} disabled={disabled || changed === 0} className="pn-btn pn-btn--sm pn-btn--paper self-start">
                <RotateCcw className="size-3.5" strokeWidth={1.9} aria-hidden />
                Ayarları sıfırla
              </button>
            </>
          )}

          {/* Named, not hidden: a student who hears "negatif prompt" in class
              should find the word here, with an honest reason it is off. */}
          <ul className="flex flex-col gap-1 border-t border-[color:var(--pn-hair)] pt-2.5">
            {DEFERRED.map(([name, why]) => (
              <li key={name} className="flex items-center gap-2 rounded-[10px] bg-surface-low px-2.5 py-1.5 text-on-surface-variant">
                <Lock className="size-3 shrink-0 opacity-60" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-on-surface">{name}</span>
                  <span className="block text-[10px] leading-snug">{why}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Dials that are named but not shipped, with the real reason each is off.
 * "Yakında" on its own teaches a student that labels are decoration; a reason
 * teaches them that a tool has edges.
 */
const DEFERRED: [string, string][] = [
  ["Negatif prompt · Stil · Adım sayısı", "Sağlayıcıya özel ayarlar. OpenRouter bunları sessizce yok sayıyor — çalıştığını doğrulayamadığımız bir kadranı açmıyoruz."],
  ["Varyant sayısı", "Bir sohbet turu tek bir çıktı tutuyor; dört varyantın üçü kayboldu görünürdü."],
  ["Seslendirme & ses klonlama", "Ayrı bir uç nokta. Türkçesi canlı test edilmeden derse girmeyecek."],
];

/* ------------------------------------------------------------------ */

function Dial({
  field,
  role,
  value,
  onChange,
  disabled,
}: {
  field: StudioField;
  role: Role;
  value: StudioParams[string] | undefined;
  onChange: (key: string, value: StudioParams[string]) => void;
  disabled: boolean;
}) {
  const spec = field.spec;

  if (spec.control === "toggle") {
    const on = value === true;
    return (
      <div className="flex items-center gap-2">
        <Label field={field} role={role} className="flex-1" />
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={field.label}
          disabled={disabled}
          onClick={() => onChange(field.key, !on)}
          className={cn(
            "inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-[2px] transition-colors disabled:opacity-50",
            on ? "border-[color:var(--pn-mint-ink)] bg-[color:var(--pn-mint-ink)]" : "border-[color:var(--pn-hair-strong)] bg-surface-low",
          )}
        >
          <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out", on ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
    );
  }

  if (spec.control === "choice") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label field={field} role={role} />
        <div role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-1.5">
          {spec.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={String(value ?? field.default) === o.value}
              title={o.hint}
              disabled={disabled}
              onClick={() => onChange(field.key, o.value)}
              className="pg-chip !h-8 !px-2.5 !text-[12px]"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (spec.control === "slider") {
    // Null means "model's default" — the slider parks at its midpoint and the
    // value reads "otomatik" until it is actually moved, so an untouched dial
    // never puts a number on the wire.
    const untouched = value === null || value === undefined;
    const shown = untouched ? (spec.min + spec.max) / 2 : Number(value);
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Label field={field} role={role} className="flex-1" />
          <span className="font-mono text-[11px] font-semibold tabular-nums text-on-surface-variant">
            {untouched ? "otomatik" : `${round(shown)}${spec.unit ? ` ${spec.unit}` : ""}`}
          </span>
        </div>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={shown}
          disabled={disabled}
          aria-label={field.label}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className="pg-range"
        />
      </div>
    );
  }

  if (spec.control === "seed") {
    const locked = typeof value === "number";
    return (
      <div className="flex items-center gap-2">
        <Label field={field} role={role} className="flex-1" />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-on-surface-variant">{locked ? value : "rastgele"}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(field.key, locked ? null : Math.floor(Math.random() * 1_000_000))}
          title={locked ? "Tohumu bırak — her seferinde farklı sonuç" : "Tohum kilitle — aynı istek aynı sonucu versin"}
          aria-pressed={locked}
          className="pg-chip !h-8 !px-2.5 !text-[12px]"
        >
          <Dices className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />
          {locked ? "Kilitli" : "Kilitle"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label field={field} role={role} />
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        maxLength={spec.maxLength}
        placeholder={spec.placeholder}
        disabled={disabled}
        aria-label={field.label}
        onChange={(e) => onChange(field.key, e.target.value.length > 0 ? e.target.value : null)}
        className="h-9 w-full rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-container px-2.5 text-[12px] text-on-surface outline-none placeholder:text-outline focus-visible:border-[color:var(--pn-blue-ink)]"
      />
    </div>
  );
}

/**
 * The label and its (i).
 *
 * The bubble is a real popover, not a `title`: students work on tablets, and
 * hover is not a thing there. It opens on tap and on keyboard focus, closes on
 * Escape, and is tied to nothing else — the icon is the only trigger, so a dial
 * is never accidentally moved while reading about it.
 */
function Label({ field, role, className }: { field: StudioField; role: Role; className?: string }) {
  const doc = paramDoc(field.key);
  const showTech = role !== "student" && !!doc.tech;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <span className="truncate text-[12px] font-semibold text-on-surface">{field.label}</span>
      {doc.kid && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${field.label} — bu ayar ne yapar?`}
              className="grid size-5 shrink-0 place-items-center rounded-full text-outline transition-colors hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-secondary)]"
            >
              <Info className="size-3.5" strokeWidth={1.9} aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent role="tooltip" side="left" align="start" className="w-64 gap-1.5">
            <p className="text-[12px] font-semibold leading-snug text-on-surface">{field.label}</p>
            <p className="text-[12px] leading-relaxed text-on-surface-variant">{doc.kid}</p>
            {showTech && <p className="font-mono text-[10.5px] leading-relaxed text-[color:var(--pn-violet-ink)]">{doc.tech}</p>}
            {doc.cost && <p className="text-[11px] leading-relaxed text-[color:var(--pn-peach-ink)]">{doc.cost}</p>}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** Two decimals at most, and no trailing zeroes — "0.85", "28", "1.5". */
function round(n: number): string {
  return String(Math.round(n * 100) / 100);
}
