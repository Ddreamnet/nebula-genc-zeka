"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  Lock,
  Zap,
  Copy,
  Check,
  Download,
  LayoutGrid,
  CalendarDays,
  Layers,
  MessageSquareText,
  Box,
  Clapperboard,
  Music2,
  Globe,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/cn";
import { whatsappHref } from "@/lib/site";
import { CATEGORIES, FEATURED_TOOL, findTool, type PlaygroundTool } from "@/lib/playground/tools";
import { CURRICULUM_MONTHS, weeksInMonth, resolveWeekTools } from "@/lib/playground/curriculum";
import { ProviderBadge } from "./provider-logos";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";

// Keep in sync with HISTORY_LIMIT in app/api/playground/generate/route.ts —
// this is just to avoid sending an oversized payload; the server enforces
// its own cap regardless of what the client sends.
const HISTORY_LIMIT = 20;

type Msg = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  videoPending?: boolean;
  audioUrl?: string;
  kind?: "text" | "code";
};

type GateReason = "insufficient_balance" | "login_required" | null;

// "Tümü" menu shows everything in one place; the featured tool lives only here, not under any single category.
const ALL_TOOLS_FLAT: PlaygroundTool[] = [FEATURED_TOOL, ...CATEGORIES.flatMap((c) => c.tools)];

function oreLabel(tool: PlaygroundTool): string {
  if (tool.modality === "text") {
    return findTool(tool.id)?.category?.id === "web" ? "~20 üretim = 1 cevher" : "~20 mesaj = 1 cevher";
  }
  // Audio replies vary in length like text does — voice tools (fractional oreCost)
  // get the same "~N use = 1 cevher" framing; flat-rate music tools (Lyria) don't.
  if (tool.modality === "audio" && tool.oreCost > 0 && tool.oreCost < 1) {
    return `~${Math.round(1 / tool.oreCost)} kullanım = 1 cevher`;
  }
  return `${tool.oreCost} cevher / üretim`;
}

function formatOre(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/**
 * Hover-to-open for mouse/trackpad users (no click required), while Radix's
 * own trigger click-toggle keeps working underneath for touch devices where
 * hover never fires. A short close delay lets the pointer travel from the
 * trigger down into the portal-rendered content without it snapping shut.
 */
function useHoverPopover(closeDelay = 120) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }
  function openNow() {
    cancelClose();
    setOpen(true);
  }
  function scheduleClose() {
    cancelClose();
    timerRef.current = setTimeout(() => setOpen(false), closeDelay);
  }

  useEffect(() => cancelClose, []);

  return {
    open,
    setOpen,
    hoverProps: {
      onMouseEnter: openNow,
      onMouseLeave: scheduleClose,
    },
  };
}

async function pollVideoStatus(generationId: string, onUpdate: (patch: Partial<Msg>) => void, onDone: () => void) {
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`/api/playground/generate/${generationId}/status`);
      const data = await res.json();
      if (data.status === "completed") {
        onUpdate({ videoPending: false, videoUrl: data.videoUrl });
        onDone();
        return;
      }
      if (data.status === "failed") {
        onUpdate({ videoPending: false, content: "Video oluşturulamadı, başka bir şey dener misin? 💫" });
        onDone();
        return;
      }
    } catch {
      // transient network hiccup — keep polling until deadline
    }
  }
  onUpdate({ videoPending: false, content: "Bu beklenenden uzun sürdü, birazdan tekrar dener misin? 💫" });
  onDone();
}

export function Playground() {
  const [activeTool, setActiveTool] = useState<PlaygroundTool>(FEATURED_TOOL);
  const [soonNotice, setSoonNotice] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(20);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const gated = gateReason !== null || remaining < activeTool.oreCost;

  useEffect(() => {
    fetch("/api/playground/balance")
      .then((r) => {
        if (!r.ok) {
          // Session expired mid-visit — Playground is student-only right now.
          window.location.href = "/giris";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setRemaining(data.balance);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!soonNotice) return;
    const t = setTimeout(() => setSoonNotice(null), 2400);
    return () => clearTimeout(t);
  }, [soonNotice]);

  function setLastAssistant(patch: Partial<Msg>) {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = { ...last, ...patch };
      return copy;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || gated) return;
    setInput("");
    setBusy(true);

    // Session memory — only makes sense for text chat (image/video/audio
    // tools are one-shot generations, not a conversation). Trimmed to the
    // last HISTORY_LIMIT turns so cost doesn't grow unbounded; server
    // re-enforces the same cap, this is just to keep the payload small.
    const history =
      activeTool.modality === "text"
        ? messages.filter((m) => m.content.trim()).slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content }))
        : [];

    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: activeTool.id, prompt: q, history }),
      });
      const data = await res.json();

      if (data.gated) {
        setMessages((m) => m.slice(0, -2));
        setRemaining(data.remaining ?? 0);
        setGateReason(data.reason === "login_required" ? "login_required" : "insufficient_balance");
        setBusy(false);
        return;
      }

      if (data.error) {
        setLastAssistant({ content: "Bu isteği oluşturamadım, başka bir şey dener misin? 💫" });
        setBusy(false);
        return;
      }

      setRemaining(data.remaining);

      if (data.modality === "text") {
        setLastAssistant({ content: data.content, kind: data.kind === "code" ? "code" : "text" });
        setBusy(false);
      } else if (data.modality === "image") {
        setLastAssistant({ imageUrl: data.imageUrl });
        setBusy(false);
      } else if (data.modality === "audio") {
        setLastAssistant({ audioUrl: data.audioUrl });
        setBusy(false);
      } else {
        setLastAssistant({ videoPending: true });
        await pollVideoStatus(data.generationId, setLastAssistant, () => setBusy(false));
      }
    } catch {
      setLastAssistant({ content: "Bir şeyler ters gitti, tekrar dener misin? 💫" });
      setBusy(false);
    }
  }

  function selectTool(tool: PlaygroundTool) {
    if (tool.status === "soon") {
      setSoonNotice(tool.name);
      return;
    }
    if (tool.id === activeTool.id) return;
    setActiveTool(tool);
    setMessages([]);
    setGateReason(null);
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Ambient glow accents — purely decorative, GPU-cheap (opacity/transform only) */}
      <div aria-hidden className="pointer-events-none absolute -left-32 top-24 size-72 rounded-full bg-secondary/10 blur-3xl animate-pulse-glow" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-96 size-80 rounded-full bg-primary/10 blur-3xl animate-pulse-glow [animation-delay:1.5s]" />

      <header className="sticky top-0 z-20 border-b border-white/5 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <Logo light disableLink large />
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-surface-high/60 px-3 py-1.5 text-on-surface-variant">
                <Zap className="size-3.5 text-secondary" />
                {formatOre(remaining)} cevher
              </span>
              <Link
                href="/dashboard"
                className="rounded-full bg-secondary px-4 py-1.5 font-semibold text-on-secondary transition hover:brightness-110"
              >
                Panele dön
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-3">
            <CategoryMegaMenu activeToolId={activeTool.id} onSelect={selectTool} />
            <CurriculumMegaMenu activeToolId={activeTool.id} onSelect={selectTool} />
          </div>
        </div>
      </header>

      <div
        className="relative mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4 pt-6"
        style={{ paddingBottom: composerHeight || 16 }}
      >
        <div className="mb-4 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Ne üretmek istersin?</h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-on-surface-variant">
            Üstteki bir kategorinin üzerine gel, o işe yarayan yapay zekaları gör, birini seç.
          </p>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
          {messages.length === 0 ? null : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} busy={busy && i === messages.length - 1} />
              ))}
            </div>
          )}
        </div>

        {gated && <GatedCallout gateReason={gateReason} />}

        <div className="flex justify-end pt-1">
          <ActiveToolBadge tool={activeTool} />
        </div>
      </div>

      <Composer
        input={input}
        setInput={setInput}
        onSend={send}
        busy={busy}
        gated={gated}
        onHeightChange={setComposerHeight}
        placeholder={findTool(activeTool.id)?.category?.id === "web" ? "Hayalindeki siteyi, oyunu tarif et..." : "Bir şeyler hayal et..."}
      />

      {/* "Yakında" toast for locked tools */}
      {soonNotice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-2 rounded-full border border-secondary/25 bg-surface-high/95 px-4 py-2.5 text-sm text-on-surface shadow-lg backdrop-blur-xl">
            <Lock className="size-3.5 text-secondary" />
            <strong className="font-medium">{soonNotice}</strong> çok yakında burada olacak.
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared trigger pill style for the two header mega-menus — highlights while its box is open. */
function menuTriggerClass(open: boolean): string {
  return cn(
    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs transition",
    open
      ? "border-secondary/50 bg-secondary/15 text-secondary-bright"
      : "border-white/8 bg-surface-container/50 text-on-surface-variant hover:border-white/20 hover:text-on-surface",
  );
}

/** A single model result inside either mega-menu's right-hand grid: logo, name, short description, ore cost. */
function ToolCard({ tool, active, onSelect }: { tool: PlaygroundTool; active: boolean; onSelect: () => void }) {
  const isSoon = tool.status === "soon";
  return (
    <button
      onClick={onSelect}
      title={`${tool.name} · ${tool.description}`}
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-2 text-left transition",
        active ? "border-secondary/40 bg-secondary/12" : "border-white/6 bg-surface-container/40 hover:border-white/15 hover:bg-surface-container/70",
        isSoon && "opacity-70",
      )}
    >
      <div className="flex items-center gap-1.5">
        {tool.provider ? (
          <ProviderBadge provider={tool.provider} className="size-6 shrink-0" />
        ) : (
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
            <tool.icon className="size-3" />
          </span>
        )}
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold">
          <span className="truncate">{tool.name}</span>
          {tool.id === FEATURED_TOOL.id && <Sparkles className="size-2.5 shrink-0 text-secondary" />}
        </span>
      </div>
      <p className="line-clamp-2 text-[10px] leading-snug text-on-surface-variant/75">{tool.description}</p>
      {isSoon ? (
        <span className="mt-auto inline-flex items-center gap-0.5 font-mono text-[8px] uppercase tracking-wide text-on-surface-variant/60">
          <Lock className="size-2" /> Yakında
        </span>
      ) : (
        <span className="mt-auto font-mono text-[9px] text-secondary-bright/80">{oreLabel(tool)}</span>
      )}
    </button>
  );
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
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

/**
 * "Kategori" header pill: hovering opens a two-pane box — a category list on
 * the left (live-updates on hover, no click needed) and that category's full
 * model grid on the right (logo, name, description, ore cost). Replaces the
 * old row of separate category pills next to the trigger.
 */
function CategoryMegaMenu({ activeToolId, onSelect }: { activeToolId: string; onSelect: (tool: PlaygroundTool) => void }) {
  const { open, setOpen, hoverProps } = useHoverPopover();
  const activeEntryId = CATEGORY_MENU_ENTRIES.find((e) => e.id !== "all" && e.tools.some((t) => t.id === activeToolId))?.id ?? "all";
  const [hovered, setHovered] = useState(activeEntryId);
  const shown = CATEGORY_MENU_ENTRIES.find((e) => e.id === hovered) ?? CATEGORY_MENU_ENTRIES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={() => {
            setHovered(activeEntryId);
            hoverProps.onMouseEnter();
          }}
          onMouseLeave={hoverProps.onMouseLeave}
          onClick={() => setHovered(activeEntryId)}
          className={menuTriggerClass(open)}
        >
          <LayoutGrid className="size-3.5" /> Kategori
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        {...hoverProps}
        className="flex h-72 w-[min(560px,92vw)] flex-row gap-0 overflow-hidden rounded-2xl border border-white/10 bg-surface-high/95 p-0 shadow-2xl ring-0 sm:h-80 sm:w-[680px]"
      >
        <div className="flex w-28 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/8 p-2 sm:w-36">
          {CATEGORY_MENU_ENTRIES.map((entry) => {
            const Icon = CATEGORY_ICONS[entry.id] ?? Layers;
            return (
              <button
                key={entry.id}
                onMouseEnter={() => setHovered(entry.id)}
                onFocus={() => setHovered(entry.id)}
                onClick={() => setHovered(entry.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[11px] transition",
                  hovered === entry.id
                    ? "bg-secondary/15 text-secondary-bright"
                    : "text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{entry.name}</span>
              </button>
            );
          })}
        </div>
        <div
          key={shown.id}
          className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto p-2.5 duration-150 animate-in fade-in-0 slide-in-from-left-1 sm:grid-cols-3"
        >
          {shown.tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              active={tool.id === activeToolId}
              onSelect={() => {
                onSelect(tool);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * "Müfredat" header pill: same two-pane shape as CategoryMegaMenu, but the
 * left list is months and the right pane groups that month's weeks — each
 * with its own real AI model cards — so a student can find "bu ayın yapay
 * zekaları" without hunting through categories.
 */
function CurriculumMegaMenu({ activeToolId, onSelect }: { activeToolId: string; onSelect: (tool: PlaygroundTool) => void }) {
  const { open, setOpen, hoverProps } = useHoverPopover();
  const activeMonth =
    CURRICULUM_MONTHS.find((m) => weeksInMonth(m.month).some((w) => resolveWeekTools(w).some((t) => t.id === activeToolId)))?.month ??
    CURRICULUM_MONTHS[0].month;
  const [hovered, setHovered] = useState(activeMonth);
  const weeks = weeksInMonth(hovered);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={() => {
            setHovered(activeMonth);
            hoverProps.onMouseEnter();
          }}
          onMouseLeave={hoverProps.onMouseLeave}
          onClick={() => setHovered(activeMonth)}
          className={menuTriggerClass(open)}
        >
          <CalendarDays className="size-3.5" /> Müfredat
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        {...hoverProps}
        className="flex h-72 w-[min(560px,92vw)] flex-row gap-0 overflow-hidden rounded-2xl border border-white/10 bg-surface-high/95 p-0 shadow-2xl ring-0 sm:h-80 sm:w-[680px]"
      >
        <div className="flex w-28 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/8 p-2 sm:w-36">
          {CURRICULUM_MONTHS.map((m) => {
            const [ayLabel, subtitle] = m.label.split(" · ");
            return (
              <button
                key={m.month}
                onMouseEnter={() => setHovered(m.month)}
                onFocus={() => setHovered(m.month)}
                onClick={() => setHovered(m.month)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition",
                  hovered === m.month
                    ? "bg-secondary/15 text-secondary-bright"
                    : "text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface",
                )}
              >
                <span className="font-mono text-[11px] font-semibold">{ayLabel}</span>
                <span className="line-clamp-2 text-[9px] leading-snug opacity-80">{subtitle}</span>
              </button>
            );
          })}
        </div>
        <div key={hovered} className="flex-1 space-y-3 overflow-y-auto p-2.5 duration-150 animate-in fade-in-0 slide-in-from-left-1">
          {weeks.map((week) => (
            <div key={week.week}>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-secondary">Hafta {week.week}</span>
                <span className="truncate text-[11px] font-semibold">{week.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {resolveWeekTools(week).map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    active={tool.id === activeToolId}
                    onSelect={() => {
                      onSelect(tool);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** "Currently selected" indicator, tucked in a corner, not a big banner in
 *  the middle of the canvas. Mobile keeps it as plain text (no pill/icon) —
 *  there's less room and a bordered chip reads heavier than it needs to;
 *  desktop keeps the fuller chip with the provider icon. */
function ActiveToolBadge({ tool }: { tool: PlaygroundTool }) {
  return (
    <>
      <span
        title={`${tool.description} · ${oreLabel(tool)}`}
        className="max-w-[10rem] truncate text-[11px] font-medium text-on-surface-variant sm:hidden"
      >
        {tool.name}
      </span>
      <div
        title={`${tool.description} · ${oreLabel(tool)}`}
        className="hidden max-w-[13rem] shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-surface-container/50 py-1 pl-1 pr-2.5 sm:flex"
      >
        {tool.provider ? (
          <ProviderBadge provider={tool.provider} className="size-5 shrink-0" />
        ) : (
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
            <tool.icon className="size-3" />
          </span>
        )}
        <span className="truncate text-[11px] font-medium text-on-surface-variant">{tool.name}</span>
      </div>
    </>
  );
}

function GatedCallout({ gateReason }: { gateReason: GateReason }) {
  const gatedMessage =
    gateReason === "login_required"
      ? "Video oluşturma sadece giriş yapmış öğrenciler için açık."
      : "Ücretsiz deneme hakkın bitti. Öğrenci olarak çok daha fazlasını üret!";

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-secondary/25 bg-secondary/8 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Lock className="size-5" />
        </span>
        <p className="text-sm text-on-surface-variant">{gatedMessage}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 font-mono text-sm text-on-surface transition hover:border-secondary/40">
          Panele dön
        </Link>
        <Link
          href={whatsappHref()}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-secondary px-4 py-2 font-mono text-sm font-semibold text-on-secondary transition hover:brightness-110"
        >
          WhatsApp&apos;tan yaz
        </Link>
      </div>
    </div>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  busy,
  gated,
  placeholder,
  onHeightChange,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  gated: boolean;
  placeholder: string;
  onHeightChange: (height: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reports its own rendered height (which grows with the textarea, up to
  // max-h-40) so the scrollable message list above can reserve exactly
  // enough bottom padding — this bar is `fixed`, so nothing else in layout
  // makes room for it automatically.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      onHeightChange(0);
      return;
    }
    const ro = new ResizeObserver((entries) => onHeightChange(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [gated, onHeightChange]);

  if (gated) return null;
  return (
    <div ref={wrapperRef} className="fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto w-full max-w-4xl px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-white/10 bg-surface-container/60 p-2 focus-within:border-secondary/50"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            rows={1}
            placeholder={placeholder}
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
        <p className="mt-2 text-center font-mono text-[11px] text-on-surface-variant/50">Gerçek yapay zeka ile üretiliyor — biraz zaman alabilir</p>
      </div>
    </div>
  );
}

function Bubble({ msg, busy }: { msg: Msg; busy: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const hasMedia = !!msg.imageUrl || !!msg.videoUrl || !!msg.audioUrl;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("group relative max-w-[85%]", !isUser && "w-full sm:max-w-[85%]")}>
        {msg.imageUrl ? (
          <img src={msg.imageUrl} alt="" className="max-h-96 rounded-2xl rounded-bl-sm border border-white/8 object-contain" />
        ) : msg.videoUrl ? (
          <video src={msg.videoUrl} controls className="max-h-96 rounded-2xl rounded-bl-sm border border-white/8" />
        ) : msg.audioUrl ? (
          <audio src={msg.audioUrl} controls className="w-full max-w-xs rounded-full" />
        ) : msg.kind === "code" && msg.content ? (
          <CodeOutputView html={msg.content} />
        ) : (
          <div
            className={cn(
              "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser ? "rounded-br-sm bg-secondary/15 text-secondary-bright" : "rounded-bl-sm border border-white/8 bg-surface-high/50 text-on-surface",
            )}
          >
            {msg.content || (busy && (msg.videoPending ? <VideoWaitNotice /> : <TypingDots />))}
          </div>
        )}
        {!isUser && !busy && msg.kind !== "code" && (msg.content || hasMedia) && (
          <button
            onClick={() => {
              if (hasMedia) {
                window.open(msg.imageUrl ?? msg.videoUrl ?? msg.audioUrl, "_blank");
                return;
              }
              navigator.clipboard.writeText(msg.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label={hasMedia ? "İndir" : "Kopyala"}
            // Touch devices have no hover state — opacity-0 there would make this
            // permanently unreachable, so it's always visible below sm and only
            // hides-until-hover on pointer/desktop sizes.
            className="absolute -bottom-2 left-3 inline-flex items-center gap-1 rounded-full border border-white/8 bg-surface px-2 py-1 font-mono text-[10px] text-on-surface-variant opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
          >
            {hasMedia ? (
              <>
                <Download className="size-3" /> İndir
              </>
            ) : copied ? (
              <>
                <Check className="size-3 text-success" /> Kopyalandı
              </>
            ) : (
              <>
                <Copy className="size-3" /> Kopyala
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Models tend to wrap their HTML in a ```html fence despite being told not to — strip it if present. */
function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)\n?```/i);
  return (fenced ? fenced[1] : raw).trim();
}

function CodeOutputView({ html }: { html: string }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const source = extractHtml(html);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/8 bg-surface-high/40">
      <div className="flex items-center justify-between border-b border-white/8 px-2 py-1.5">
        <div className="inline-flex gap-0.5 rounded-full bg-surface-container/60 p-0.5 font-mono text-[10px]">
          <button
            onClick={() => setTab("preview")}
            className={cn("rounded-full px-2.5 py-1 transition", tab === "preview" ? "bg-secondary/20 text-secondary-bright" : "text-on-surface-variant")}
          >
            Önizleme
          </button>
          <button
            onClick={() => setTab("code")}
            className={cn("rounded-full px-2.5 py-1 transition", tab === "code" ? "bg-secondary/20 text-secondary-bright" : "text-on-surface-variant")}
          >
            Kod
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              navigator.clipboard.writeText(source);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label="Kopyala"
            className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container/60 hover:text-on-surface"
          >
            {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          </button>
          <button
            onClick={() => {
              const blob = new Blob([source], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "site.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
            aria-label="İndir"
            className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container/60 hover:text-on-surface"
          >
            <Download className="size-3" />
          </button>
        </div>
      </div>
      {tab === "preview" ? (
        <iframe srcDoc={source} sandbox="allow-scripts" title="Önizleme" className="h-80 w-full bg-white sm:h-96" />
      ) : (
        <pre className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-on-surface-variant">
          <code>{source}</code>
        </pre>
      )}
    </div>
  );
}

function VideoWaitNotice() {
  return (
    <span className="inline-flex items-center gap-2 py-1 text-on-surface-variant">
      <TypingDots /> Video oluşturuluyor, bu biraz zaman alabilir...
    </span>
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
