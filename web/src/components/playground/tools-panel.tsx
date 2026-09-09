"use client";

import { useEffect, useRef, useState } from "react";
import { SHEET_CLOSED_TRANSFORM, useDragToDismiss } from "@/components/panel-ui/sheet";
import { Brain, ChevronDown, Columns2, Info, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES, type PlaygroundTool } from "@/lib/playground/tools";
import type { AspectRatio } from "@/lib/playground/aspect";
import type { PayloadInput } from "@/lib/playground/payload-preview";
import type { StudioParams } from "@/lib/playground/params";
import type { AspectOption, MemoryControl } from "./composer";
import { memoryHelp } from "./composer";
import { CATEGORY_ICONS, ComparePicker, ModelPicker, oreLabel } from "./model-picker";
import { PayloadDialog } from "./payload-dialog";
import { StudioPanel } from "./studio-panel";
import { ToolAvatar } from "./transcript";

/** What the studio section needs from the page that owns the settings state. */
export interface StudioControl {
  params: StudioParams;
  onChange: (key: string, value: StudioParams[string]) => void;
  onReset: () => void;
  changed: number;
  costLine: string | null;
  atCeiling: boolean;
}

/**
 * "Düzenleme araçları" — the floating right-hand panel.
 *
 * It layers ABOVE the workspace (see `.pg-panel` in globals.css) rather than
 * taking a column of it: opening settings must never re-measure the picture a
 * student is looking at.
 *
 * Every control here is LIVE: it changes what the next Gönder sends. That rule
 * is why the studio dials at the bottom took a catalog sync to build rather
 * than a list of sliders — a dial that does nothing teaches a student that
 * dials do nothing. The handful still not shippable are named there with the
 * real reason each is off, rather than under a decorative "yakında".
 */
export function ToolsPanel({
  open,
  onClose,
  tool,
  categoryId,
  onSelectTool,
  onSelectCategory,
  aspect,
  memory,
  compare,
  payload,
  studio,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  tool: PlaygroundTool;
  categoryId: string | null;
  onSelectTool: (tool: PlaygroundTool) => void;
  onSelectCategory: (categoryId: string) => void;
  aspect: { options: AspectOption[]; value: AspectRatio | null; onChange: (value: AspectRatio) => void } | null;
  memory: MemoryControl | null;
  compare: {
    tool: PlaygroundTool | null;
    available: boolean;
    options: PlaygroundTool[];
    onToggle: () => void;
    onPick: (tool: PlaygroundTool) => void;
  };
  /** Everything the `</>` preview needs to write out the next request. */
  payload: PayloadInput;
  /** The studio: the dials this model and this role actually have. */
  studio: StudioControl;
  disabled: boolean;
}) {
  const [payloadOpen, setPayloadOpen] = useState(false);
  // On a phone the panel is a bottom sheet, pulled shut from anywhere on it
  // or on the dimmed page above it (see useDragToDismiss). Desktop pointers
  // are ignored there.
  const panelRef = useRef<HTMLElement>(null);
  useDragToDismiss(panelRef, onClose, { open, closedTransform: SHEET_CLOSED_TRANSFORM, scrim: "[data-pg-scrim]" });

  // Escape closes the panel — it floats over the workspace, so the way out has
  // to be the one every overlay in the product already uses.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside ref={panelRef} className="pg-panel pg-panel--right" data-open={open} aria-hidden={!open} inert={!open} aria-label="Düzenleme araçları">
      <header className="pg-panel-head pg-panel-handle">
        <span className="pg-panel-label text-on-surface">Düzenleme araçları</span>
        <span className="flex-1" />
        {/* The teaching button: what does Gönder actually send? */}
        <button
          type="button"
          onClick={() => setPayloadOpen(true)}
          title="Modele ne gönderiyoruz? — isteğin kod hâli"
          aria-label="Modele ne gönderiyoruz"
          className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[color:var(--pn-violet-line)] bg-[color:var(--pn-violet-tint)] font-mono text-[12px] font-bold text-[color:var(--pn-violet-ink)] transition-colors hover:bg-[color:var(--pn-violet)] pointer-fine:size-8"
        >
          &lt;/&gt;
        </button>
        {/* Desktop only: a phone closes by pulling the card down. */}
        <button type="button" onClick={onClose} aria-label="Paneli kapat" className="pn-btn pn-btn--icon pn-btn--paper !size-9 pointer-fine:!size-8 max-lg:!hidden">
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="pg-scroll flex min-h-0 flex-1 flex-col gap-5 p-4">
        {/* Model */}
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Model</SectionTitle>
          <ModelPicker activeTool={tool} onSelect={onSelectTool} align="end">
            <button
              type="button"
              disabled={disabled}
              className="flex w-full items-center gap-3 rounded-[12px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue-tint)] p-2.5 text-left transition-colors hover:bg-[color:var(--pn-blue)] disabled:opacity-60"
            >
              <ToolAvatar tool={tool} className="size-9" iconClassName="size-4" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold leading-tight text-on-surface">{tool.name}</span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-on-surface-variant">{tool.description}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-on-surface-variant" aria-hidden />
            </button>
          </ModelPicker>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.id];
              const live = c.tools.some((t) => t.status === "live");
              return (
                <button
                  key={c.id}
                  type="button"
                  data-active={categoryId === c.id}
                  disabled={disabled || !live}
                  title={live ? `${c.name} — ${c.tools.filter((t) => t.status === "live").length} model` : `${c.name} — yakında`}
                  onClick={() => onSelectCategory(c.id)}
                  className="pg-chip !h-8 !px-2.5 !text-[12px]"
                >
                  {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />}
                  {c.shortName}
                  {!live && <Lock className="size-2.5 opacity-60" aria-hidden />}
                </button>
              );
            })}
          </div>
          <p className="font-mono text-[10px] font-semibold text-[color:var(--pn-peach-ink)]">{oreLabel(tool, categoryId)}</p>
        </section>

        {/* Boyut & Oran */}
        {aspect && aspect.options.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionTitle hint="Görselin dikey mi, kare mi, geniş mi olacağını seçersin. Sticker dikey, afiş geniş olur. Liste modelin gerçekten desteklediği oranlardır.">
              Boyut &amp; Oran
            </SectionTitle>
            <div role="radiogroup" aria-label="Görselin şekli" className="grid grid-cols-4 gap-1.5">
              {aspect.options.map((r) => {
                const [w, h] = r.value.split(":").map(Number);
                const scale = 14 / Math.max(w, h);
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={r.value === aspect.value}
                    title={`${r.label} — ${r.hint}`}
                    disabled={disabled}
                    onClick={() => aspect.onChange(r.value)}
                    className="pg-chip pg-chip--mono !h-12 !flex-col !gap-1 !px-1"
                  >
                    <span aria-hidden className="rounded-[2px] border-[1.5px] border-current opacity-80" style={{ width: w * scale, height: h * scale }} />
                    <span>{r.value}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Hafıza */}
        {memory && (
          <section className="flex flex-col gap-2.5">
            <SectionTitle hint={memoryHelp(memory)}>Hafıza</SectionTitle>
            <SwitchRow
              icon={Brain}
              on={memory.on}
              disabled={disabled || !!compare.tool}
              onToggle={memory.onToggle}
              label={memory.on ? "Açık" : "Kapalı"}
              detail={
                compare.tool
                  ? "Karşılaştırma açıkken hafıza kapalı kalır"
                  : memory.kind === "text"
                    ? "Model bu sohbette yazılanları okur"
                    : memory.carrying
                      ? "Son görselden devam eder"
                      : "İlk görselden sonra ondan devam eder"
              }
            />
          </section>
        )}

        {/* Karşılaştır */}
        <section className="flex flex-col gap-2.5">
          <SectionTitle hint="Aynı isteği iki farklı modele gönder, cevaplarını yan yana gör. İki üretim, iki katı cevher. Videoda kapalı: iki video hem çok cevher harcar hem dakikalarca sürer.">
            Karşılaştır
          </SectionTitle>
          <SwitchRow
            icon={Columns2}
            on={!!compare.tool}
            disabled={disabled || !compare.available}
            onToggle={compare.onToggle}
            label={compare.tool ? "Açık" : compare.available ? "Kapalı" : "Videoda kapalı"}
            detail={compare.tool ? "Cevaplar yan yana gelir" : "Aynı istek, iki model"}
          />
          {compare.tool && (
            <div className="flex items-center gap-1.5">
              <span className="pg-chip !h-9 !flex-1 !justify-start !gap-1.5 !px-2 !text-[12px]" aria-label={`A: ${tool.name}`}>
                <span className="font-mono text-[10px] text-on-surface-variant">A</span>
                <ToolAvatar tool={tool} className="size-5" iconClassName="size-2.5" />
                <span className="truncate">{tool.name}</span>
              </span>
              <ComparePicker tool={compare.tool} options={compare.options} disabled={disabled} onPick={compare.onPick}>
                <button type="button" disabled={disabled} className="pg-chip !h-9 !flex-1 !justify-start !gap-1.5 !px-2 !text-[12px]" title={`Sağdaki model: ${compare.tool.name}`}>
                  <span className="font-mono text-[10px] text-on-surface-variant">B</span>
                  <ToolAvatar tool={compare.tool} className="size-5" iconClassName="size-2.5" />
                  <span className="truncate">{compare.tool.name}</span>
                  <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              </ComparePicker>
            </div>
          )}
        </section>

        <StudioPanel
          tool={tool}
          role={payload.role}
          params={studio.params}
          onChange={studio.onChange}
          onReset={studio.onReset}
          changed={studio.changed}
          costLine={studio.costLine}
          atCeiling={studio.atCeiling}
          disabled={disabled}
        />
      </div>

      <PayloadDialog open={payloadOpen} onOpenChange={setPayloadOpen} input={payload} />
    </aside>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <h3 className="pg-section-title">{children}</h3>
      {hint && (
        // Title attribute for the pointer, aria-label for the reader. A real
        // popover comes with the studio's (i) system (plan §4).
        <span className="grid size-5 place-items-center rounded-full text-outline" title={hint} aria-label={hint} role="img">
          <Info className="size-3.5" strokeWidth={1.9} aria-hidden />
        </span>
      )}
    </div>
  );
}

function SwitchRow({
  icon: Icon,
  on,
  disabled,
  onToggle,
  label,
  detail,
}: {
  icon: typeof Brain;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[12px] border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on ? "border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint-tint)]" : "border-[color:var(--pn-hair)] bg-surface-container hover:bg-surface-low",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[9px]",
          on ? "bg-[color:var(--pn-mint)] text-[color:var(--pn-mint-ink-strong)]" : "bg-surface-low text-on-surface-variant",
        )}
      >
        <Icon className="size-4" strokeWidth={1.9} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-tight text-on-surface">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-on-surface-variant">{detail}</span>
      </span>
      {/* The knob: a real switch a student can read without pressing. */}
      <span
        aria-hidden
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-[2px] transition-colors",
          on ? "border-[color:var(--pn-mint-ink)] bg-[color:var(--pn-mint-ink)]" : "border-[color:var(--pn-hair-strong)] bg-surface-low",
        )}
      >
        <span className={cn("size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out", on ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}
