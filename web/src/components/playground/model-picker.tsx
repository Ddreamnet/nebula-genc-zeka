"use client";

import {useMemo, useState, type ReactNode } from "react";
import {
  Box,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  Gamepad2,
  Globe,
  Layers,
  LayoutGrid,
  Lock,
  MessageSquareText,
  Music2,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/panel-ui/sheet";
import { useIsWide } from "@/lib/use-is-wide";
import { CATEGORIES, FEATURED_TOOL, type PlaygroundTool } from "@/lib/playground/tools";
import { CURRICULUM_MONTHS, weeksInMonth, resolveWeekTools } from "@/lib/playground/curriculum";
import { ToolAvatar } from "./transcript";

// "Tümü" shows everything in one place; the featured tool lives only here, not under any single category.
export const ALL_TOOLS_FLAT: PlaygroundTool[] = [FEATURED_TOOL, ...CATEGORIES.flatMap((c) => c.tools)];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: Layers,
  metin: MessageSquareText,
  gorsel: Box,
  video: Clapperboard,
  muzik: Music2,
  web: Globe,
  diger: Gamepad2,
};

const CATEGORY_MENU_ENTRIES: { id: string; name: string; tools: PlaygroundTool[] }[] = [
  { id: "all", name: "Tümü", tools: ALL_TOOLS_FLAT },
  ...CATEGORIES.map((c) => ({ id: c.id, name: c.shortName, tools: c.tools })),
];

export function oreLabel(tool: PlaygroundTool, categoryId?: string | null): string {
  if (tool.modality === "text") {
    return categoryId === "web" ? "~20 üretim = 1 cevher" : "~20 mesaj = 1 cevher";
  }
  // Audio replies vary in length like text does — voice tools (fractional oreCost)
  // get the same "~N use = 1 cevher" framing; flat-rate music tools (Lyria) don't.
  if (tool.modality === "audio" && tool.oreCost > 0 && tool.oreCost < 1) {
    return `~${Math.round(1 / tool.oreCost)} kullanım = 1 cevher`;
  }
  return `${tool.oreCost} cevher / üretim`;
}

function matches(tool: PlaygroundTool, needle: string): boolean {
  if (!needle) return true;
  const hay = `${tool.name} ${tool.description} ${tool.provider ?? ""}`.toLocaleLowerCase("tr-TR");
  return hay.includes(needle);
}

/** One model in the browser: logo, name, what it is for, what a turn costs. */
function ToolRow({ tool, active, onSelect }: { tool: PlaygroundTool; active: boolean; onSelect: () => void }) {
  const isSoon = tool.status === "soon";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      title={isSoon ? `${tool.name} — yakında` : `${tool.name} · ${tool.description}`}
      className={cn(
        "flex w-full items-start gap-3 rounded-[12px] border p-3 text-left transition-[background-color,border-color,transform] duration-[.16s]",
        active
          ? "border-[color:var(--pn-blue-ink)] bg-[color:var(--pn-blue-sel)]"
          : "border-[color:var(--pn-hair)] bg-surface-container hover:-translate-y-px hover:border-[color:var(--pn-blue-line)] hover:bg-[color:var(--pn-blue-tint)]",
        isSoon && "opacity-60",
      )}
    >
      <ToolAvatar tool={tool} className="mt-0.5 size-8" iconClassName="size-4" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold leading-tight text-on-surface">{tool.name}</span>
          {tool.id === FEATURED_TOOL.id && <Sparkles className="size-3 shrink-0 text-[color:var(--pn-peach-ink)]" aria-hidden />}
        </span>
        {/* No `block` here: Tailwind's line-clamp needs display:-webkit-box, and a
            display utility beside it silently wins and un-clamps the text. */}
        <span className="mt-1 line-clamp-2 text-[12px] leading-snug text-on-surface-variant">{tool.description}</span>
        <span className="mt-1.5 block font-mono text-[10px] font-semibold text-[color:var(--pn-peach-ink)]">
          {isSoon ? (
            <span className="inline-flex items-center gap-1 uppercase tracking-wide text-on-surface-variant">
              <Lock className="size-2.5" /> Yakında
            </span>
          ) : (
            oreLabel(tool)
          )}
        </span>
      </span>
    </button>
  );
}

/** Header tab — Kategoriler / Müfredat. */
function BrowserTab({ icon: Icon, label, active, onSelect }: { icon: LucideIcon; label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-semibold transition-colors",
        active ? "bg-[color:var(--pn-navy)] text-[color:var(--pn-on-navy)]" : "text-on-surface-variant hover:bg-surface-low hover:text-on-surface",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
      {label}
    </button>
  );
}

/**
 * The catalog itself — one component, two surfaces.
 *
 * Browsing by category and by curriculum week are two views of one question
 * ("which model am I talking to"), and search cuts across both: typing filters
 * the whole roster and the category rail steps aside, because at that point
 * the student knows what they are looking for.
 */
function ModelBrowser({
  activeTool,
  onPick,
  onClose,
  wide,
}: {
  activeTool: PlaygroundTool;
  onPick: (tool: PlaygroundTool) => void;
  onClose: () => void;
  wide: boolean;
}) {
  const activeCategoryId = CATEGORY_MENU_ENTRIES.find((e) => e.id !== "all" && e.tools.some((t) => t.id === activeTool.id))?.id ?? "all";
  const activeMonth =
    CURRICULUM_MONTHS.find((m) => weeksInMonth(m.month).some((w) => resolveWeekTools(w).some((t) => t.id === activeTool.id)))?.month ??
    CURRICULUM_MONTHS[0].month;

  const [mode, setMode] = useState<"category" | "curriculum">("category");
  const [category, setCategory] = useState(activeCategoryId);
  const [month, setMonth] = useState(activeMonth);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const searching = needle.length > 0;
  const results = useMemo(() => (searching ? ALL_TOOLS_FLAT.filter((t) => matches(t, needle)) : []), [needle, searching]);
  const shownCategory = CATEGORY_MENU_ENTRIES.find((e) => e.id === category) ?? CATEGORY_MENU_ENTRIES[0];

  // Two columns, never three: at popover width a third column leaves ~170px
  // per card and every description wraps to five lines.
  const grid = wide ? "grid gap-2.5 sm:grid-cols-2" : "flex flex-col gap-2";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search first: it is the fastest path once someone knows the name. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color:var(--pn-hair)] px-4 py-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-outline" strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Model ara…"
            aria-label="Model ara"
            className="pn-bare h-9 w-full rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-low pl-9 pr-3 text-[13px] text-on-surface outline-none transition-colors focus-visible:border-[color:var(--color-secondary)]"
          />
        </div>
        {!searching && (
          <div className="flex shrink-0 items-center gap-1">
            <BrowserTab icon={LayoutGrid} label="Kategoriler" active={mode === "category"} onSelect={() => setMode("category")} />
            <BrowserTab icon={CalendarDays} label="Müfredat" active={mode === "curriculum"} onSelect={() => setMode("curriculum")} />
          </div>
        )}
        {!wide && (
          <button type="button" onClick={onClose} aria-label="Kapat" className="pn-btn pn-btn--icon pn-btn--paper shrink-0">
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {searching ? (
        <div className="pg-scroll min-h-0 flex-1 p-4">
          {results.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-on-surface-variant">“{query}” için model bulunamadı.</p>
          ) : (
            <div className={grid}>
              {results.map((tool) => (
                <ToolRow key={tool.id} tool={tool} active={tool.id === activeTool.id} onSelect={() => onPick(tool)} />
              ))}
            </div>
          )}
        </div>
      ) : mode === "category" ? (
        <div className={cn("flex min-h-0 flex-1", wide ? "flex-row" : "flex-col")}>
          {/* Rail on a wide screen, a scrolling chip row on a narrow one. */}
          {wide ? (
            <div className="pg-scroll flex w-48 shrink-0 flex-col gap-1 border-r border-[color:var(--pn-hair)] p-3">
              {CATEGORY_MENU_ENTRIES.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.id] ?? Layers;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setCategory(entry.id)}
                    aria-current={category === entry.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-semibold transition-colors",
                      category === entry.id
                        ? "bg-[color:var(--pn-blue)] text-[color:var(--pn-blue-ink-strong)]"
                        : "text-on-surface-variant hover:bg-surface-low hover:text-on-surface",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                    <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums opacity-70">{entry.tools.length}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
              {CATEGORY_MENU_ENTRIES.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.id] ?? Layers;
                return (
                  <button key={entry.id} type="button" onClick={() => setCategory(entry.id)} data-active={category === entry.id} className="pg-chip shrink-0">
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />
                    {entry.name}
                  </button>
                );
              })}
            </div>
          )}

          <div key={shownCategory.id} className="pg-scroll min-h-0 flex-1 p-4 duration-150 animate-in fade-in-0">
            <div className={grid}>
              {shownCategory.tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} active={tool.id === activeTool.id} onSelect={() => onPick(tool)} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("flex min-h-0 flex-1", wide ? "flex-row" : "flex-col")}>
          {wide ? (
            <div className="pg-scroll flex w-48 shrink-0 flex-col gap-1 border-r border-[color:var(--pn-hair)] p-3">
              {CURRICULUM_MONTHS.map((m) => {
                const [ayLabel, subtitle] = m.label.split(" · ");
                return (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => setMonth(m.month)}
                    aria-current={month === m.month ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-[10px] px-3 py-2 text-left transition-colors",
                      month === m.month
                        ? "bg-[color:var(--pn-blue)] text-[color:var(--pn-blue-ink-strong)]"
                        : "text-on-surface-variant hover:bg-surface-low hover:text-on-surface",
                    )}
                  >
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide">{ayLabel}</span>
                    <span className="line-clamp-2 text-[12px] leading-snug opacity-80">{subtitle}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
              {CURRICULUM_MONTHS.map((m) => (
                <button key={m.month} type="button" onClick={() => setMonth(m.month)} data-active={month === m.month} className="pg-chip shrink-0">
                  {m.label.split(" · ")[0]}
                </button>
              ))}
            </div>
          )}

          <div key={month} className="pg-scroll min-h-0 flex-1 space-y-4 p-4 duration-150 animate-in fade-in-0">
            {weeksInMonth(month).map((week) => (
              <div key={week.week}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-[color:var(--pn-peach-ink)]">
                    Hafta {week.week}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-on-surface">{week.title}</span>
                </div>
                <div className={grid}>
                  {resolveWeekTools(week).map((tool) => (
                    <ToolRow key={tool.id} tool={tool} active={tool.id === activeTool.id} onSelect={() => onPick(tool)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The whole catalog behind one control.
 *
 * Click to open, click (or Esc) to close — the old build opened on hover and
 * shut itself on a 120ms timer, which is exactly the behaviour that makes a
 * picker feel like it is fighting the pointer. On a wide screen it is a
 * popover tethered to its trigger; below that it is a bottom sheet, because a
 * two-pane browser squeezed into a phone-width popover is not a smaller
 * browser, it is an unusable one.
 */
export function ModelPicker({
  activeTool,
  onSelect,
  children,
  align = "start",
}: {
  activeTool: PlaygroundTool;
  onSelect: (tool: PlaygroundTool) => void;
  /** The trigger. Rendered with Radix's `asChild`, so it must forward props. */
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const wide = useIsWide();

  function pick(tool: PlaygroundTool) {
    onSelect(tool);
    setOpen(false);
  }

  // Keyed on `open` so the browser starts fresh every time: the search box is
  // empty and the rail sits on the current model's own category.
  const body = <ModelBrowser key={String(open)} activeTool={activeTool} onPick={pick} onClose={() => setOpen(false)} wide={wide} />;

  if (!wide) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {/* asChild: the caller's own button becomes the trigger, so there is
            never a button nested inside a button. */}
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent size="lg" onDismiss={() => setOpen(false)} aria-label="Model seç">
          <SheetTitle className="sr-only">Model seç</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} sideOffset={10} collisionPadding={16} className="pg-browser">
        <div className="flex h-[min(560px,72vh)] flex-col">{body}</div>
      </PopoverContent>
    </Popover>
  );
}

/** The composer's model chip — logo, name, chevron. */
export function ModelChip({ tool, className, ...props }: { tool: PlaygroundTool; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title={`${tool.name} — ${tool.description}`}
      className={cn(
        "pg-chip !gap-2 !border-[color:var(--pn-blue-line)] !bg-[color:var(--pn-blue-tint)] !pl-1.5 !pr-2.5 !text-[color:var(--pn-blue-ink-strong)]",
        className,
      )}
      {...props}
    >
      <ToolAvatar tool={tool} className="size-6" iconClassName="size-3" />
      <span className="max-w-[9rem] truncate">{tool.name}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" />
    </button>
  );
}

/**
 * The right-hand model of a comparison: a small list, not the whole catalog.
 * The choice is narrow by construction — live models of the same modality as
 * the left-hand side — and offering the full browser would present video
 * models a comparison cannot run and text models that would not answer the
 * same question.
 */
export function ComparePicker({
  tool,
  options,
  disabled,
  onPick,
  children,
}: {
  tool: PlaygroundTool;
  options: PlaygroundTool[];
  disabled: boolean;
  onPick: (tool: PlaygroundTool) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[min(320px,92vw)] gap-0 p-1.5">
        <p className="px-2 pb-1.5 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Sağdaki model</p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onPick(t);
                setOpen(false);
              }}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-colors",
                t.id === tool.id ? "bg-[color:var(--pn-blue-sel)] text-on-surface" : "text-on-surface-variant hover:bg-surface-low hover:text-on-surface",
              )}
            >
              <ToolAvatar tool={t} className="size-6" iconClassName="size-3" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{t.name}</span>
                <span className="block truncate font-mono text-[10px] text-on-surface-variant">{oreLabel(t)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
