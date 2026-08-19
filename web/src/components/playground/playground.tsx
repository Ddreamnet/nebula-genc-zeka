"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  ImagePlus,
  ChevronDown,
  ArrowLeft,
  X,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/cn";
import { whatsappHref } from "@/lib/site";
import { WhatsappIcon } from "@/components/ui/brand-icons";
import { CATEGORIES, FEATURED_TOOL, findTool, generationOreCost, type PlaygroundTool } from "@/lib/playground/tools";
import { CURRICULUM_MONTHS, weeksInMonth, resolveWeekTools } from "@/lib/playground/curriculum";
import { ProviderBadge } from "./provider-logos";
import { ChatHistory } from "./chat-history";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";

// Keep in sync with HISTORY_LIMIT in app/api/playground/generate/route.ts —
// this is just to avoid sending an oversized payload; the server enforces
// its own cap regardless of what the client sends.
const HISTORY_LIMIT = 20;

// Attached images are downscaled here, in the browser, before they ever hit
// the network: a phone photo is several MB and would be billed as prompt
// tokens at full size for no visible gain. 1024px on the long edge is what
// the per-image ore surcharge in tools.ts is priced against.
const MAX_IMAGE_EDGE = 1024;

/**
 * Decodes, downscales and re-encodes a picked/pasted/dropped file to a JPEG
 * data URL. Returns null for anything that isn't a decodable image, so a
 * stray PDF drag lands as "ignored" rather than a broken attachment.
 *
 * JPEG has no alpha channel, so transparent PNGs are composited onto white
 * first — otherwise the untouched canvas shows through as solid black.
 */
async function toAttachmentDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  /** Images the student attached to their own message, as data URLs. */
  attachments?: string[];
  imageUrl?: string;
  videoUrl?: string;
  videoPending?: boolean;
  audioUrl?: string;
  /**
   * "switch" is not a message at all — it's the marker dropped into the
   * transcript when the student changes model mid-conversation, so the thread
   * shows where the handover happened instead of silently continuing under a
   * different brand. Carries no content and is never sent to any model.
   */
  kind?: "text" | "code" | "switch";
  /**
   * Which tool produced this turn. Needed because the conversation now
   * survives model changes: rendering every bubble with the *current* model's
   * avatar would retroactively re-attribute old answers to whichever model
   * happens to be selected now.
   */
  toolId?: string;
};

type GateReason = "insufficient_balance" | "login_required" | null;

/**
 * Transient toast above the composer. `soon` explains a locked tool; `reset`
 * explains that switching models cleared the transcript — without it the
 * conversation just vanishes and the new model reads as having forgotten
 * everything, which is exactly how the behaviour was misread in testing.
 */
type Notice = { kind: "soon"; tool: string };

const NOTICE_MS: Record<Notice["kind"], number> = { soon: 2400 };

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

/**
 * Video is the one async modality: ore is debited up front and the result
 * arrives minutes later, so how this loop ends decides whether a student pays
 * for nothing. Two rules follow from that:
 *  - the deadline is generous (the pricier models genuinely run past five
 *    minutes, and the old 5-minute ceiling was giving up on live jobs), and
 *  - giving up is an explicit server call, not just a UI message — /abandon
 *    re-checks the job and refunds the ore if it really never landed.
 */
const VIDEO_DEADLINE_MS = 10 * 60 * 1000;

async function pollVideoStatus(
  generationId: string,
  onUpdate: (patch: Partial<Msg>) => void,
  onDone: () => void,
  /** Called with the bucket path once the file exists, so the transcript row
   *  this video belongs to can finally be settled. */
  onLanded?: (outputPath: string | null) => void,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < VIDEO_DEADLINE_MS) {
    // Tight at first (short clips often land inside a minute), then relaxed —
    // ten minutes at a flat 3s would be 200 requests for one video.
    const elapsed = Date.now() - startedAt;
    await new Promise((r) => setTimeout(r, elapsed < 60_000 ? 3000 : 8000));
    try {
      const res = await fetch(`/api/playground/generate/${generationId}/status`);
      const data = await res.json();
      if (data.status === "completed") {
        onUpdate({ videoPending: false, videoUrl: data.videoUrl });
        onLanded?.(data.outputPath ?? null);
        onDone();
        return;
      }
      if (data.status === "failed") {
        onUpdate({ videoPending: false, content: "Video oluşturulamadı — harcadığın cevher hesabına geri yüklendi. Başka bir şey dener misin? 💫" });
        onDone();
        return;
      }
    } catch {
      // transient network hiccup — keep polling until deadline
    }
  }

  let refunded = false;
  try {
    const res = await fetch(`/api/playground/generate/${generationId}/abandon`, { method: "POST" });
    const data = await res.json();
    // The last-ditch poll inside /abandon can still find a finished job.
    if (data.status === "completed") {
      const done = await fetch(`/api/playground/generate/${generationId}/status`).then((r) => r.json());
      if (done.status === "completed") {
        onUpdate({ videoPending: false, videoUrl: done.videoUrl });
        onLanded?.(done.outputPath ?? null);
        onDone();
        return;
      }
    }
    refunded = data.refunded === true;
  } catch {
    // Couldn't reach our own server — say the honest thing rather than
    // promising a refund that may not have happened.
  }

  onUpdate({
    videoPending: false,
    content: refunded
      ? "Bu video beklenenden uzun sürdü, iptal ettim — harcadığın cevher hesabına geri yüklendi. Tekrar dener misin? 💫"
      : "Bu video beklenenden uzun sürdü. Cevherin durumunu kontrol ediyoruz; birazdan tekrar dener misin? 💫",
  });
  onDone();
}

export function Playground() {
  const [activeTool, setActiveTool] = useState<PlaygroundTool>(FEATURED_TOOL);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(20);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  /** Server-side thread this transcript belongs to; null until the first turn. */
  const [chatId, setChatId] = useState<string | null>(null);
  /** Bumped whenever the history list could have changed, to re-fetch it. */
  const [historyKey, setHistoryKey] = useState(0);
  const [loadingChat, setLoadingChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Index of the reply currently being generated, or -1. */
  const pendingIndex = messages.findLastIndex((m) => m.role === "assistant" && m.kind !== "switch");

  // 0 means this model can't see images at all, which is what hides the
  // attach button. The server enforces the same ceiling regardless.
  const maxImages = activeTool.maxImageInputs ?? 0;
  // Mirrors the server's carry-forward rule (generate/route.ts): the most
  // recent user turn's images are resent with the next message and billed
  // again. Counting them here is what keeps the quoted price honest.
  const carriedCount =
    activeTool.modality === "text"
      ? Math.min(
          [...messages].reverse().find((m) => m.role === "user" && m.content.trim())?.attachments?.length ?? 0,
          Math.max(0, maxImages - attachments.length),
        )
      : 0;
  // Attached images cost extra, so the balance gate has to price the message
  // as composed right now — not the tool's bare per-message rate.
  const pendingCost = generationOreCost(activeTool, attachments.length + carriedCount);
  const gated = gateReason !== null || remaining < pendingCost;

  const refreshBalance = useCallback(() => {
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
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS[notice.kind]);
    return () => clearTimeout(t);
  }, [notice]);

  /**
   * Patches the reply currently being generated. It searches backwards for the
   * last real assistant turn rather than taking the last array entry, because
   * a student can change model mid-generation (video polls for minutes) — that
   * appends a switch marker, and writing the finished video onto the marker
   * would both lose the video and turn a divider into a bubble.
   */
  function setLastAssistant(patch: Partial<Msg>) {
    setMessages((m) => {
      const i = m.findLastIndex((x) => x.role === "assistant" && x.kind !== "switch");
      if (i === -1) return m;
      const copy = m.slice();
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || gated) return;
    const sentImages = attachments;
    setInput("");
    setAttachments([]);
    setBusy(true);

    // Session memory — only makes sense for text chat (image/video/audio
    // tools are one-shot generations, not a conversation). Trimmed to the
    // last HISTORY_LIMIT turns so cost doesn't grow unbounded; server
    // re-enforces the same cap, this is just to keep the payload small.
    const priorTurns =
      activeTool.modality === "text"
        ? messages.filter((m) => m.kind !== "switch" && m.content.trim()).slice(-HISTORY_LIMIT)
        : [];
    // Only the most recent user turn's images are replayed — that's all the
    // server will use, and shipping the rest would put megabytes of dead data
    // URLs on the wire with every single message.
    const lastUserIndex = priorTurns.map((m) => m.role).lastIndexOf("user");
    const history = priorTurns.map((m, i) => ({
      role: m.role,
      content: m.content,
      images: i === lastUserIndex ? (m.attachments ?? []) : [],
    }));

    setMessages((m) => [
      ...m,
      { role: "user", content: q, attachments: sentImages },
      // Stamped with the model answering *now*, so this bubble keeps its own
      // avatar after the student moves on to a different model.
      { role: "assistant", content: "", toolId: activeTool.id },
    ]);

    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: activeTool.id, prompt: q, history, attachments: sentImages, chatId }),
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
      // The server opens the chat on the first turn and hands back its id; from
      // here on every turn rides the same thread.
      if (data.chatId && data.chatId !== chatId) setChatId(data.chatId);
      setHistoryKey((k) => k + 1);

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
        await pollVideoStatus(
          data.generationId,
          setLastAssistant,
          () => setBusy(false),
          (outputPath) => {
            if (!data.assistantMessageId) return;
            void fetch("/api/playground/chats/settle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messageId: data.assistantMessageId, kind: "video", outputPath }),
            }).then(() => setHistoryKey((k) => k + 1));
          },
        );
        // A video can end in a refund (see /abandon), so the balance shown in
        // the header is only trustworthy if it's re-read once the job settles.
        refreshBalance();
      }
    } catch {
      setLastAssistant({ content: "Bir şeyler ters gitti, tekrar dener misin? 💫" });
      setBusy(false);
    }
  }

  function selectTool(tool: PlaygroundTool) {
    if (tool.status === "soon") {
      setNotice({ kind: "soon", tool: tool.name });
      return;
    }
    if (tool.id === activeTool.id) return;
    // Changing model no longer wipes the thread. What the new model can
    // actually see depends on its modality, and that's what the inline marker
    // below spells out — so the student reads it in the transcript, at the
    // exact point it applies, instead of in a toast that disappears.
    if (messages.length > 0) {
      setMessages((m) => [...m, { role: "assistant", content: "", kind: "switch", toolId: tool.id }]);
    }
    setActiveTool(tool);
    // The new model may take fewer images than the old one — or none — so
    // staged attachments don't survive a tool switch.
    setAttachments([]);
    setGateReason(null);
  }

  function newChat() {
    setMessages([]);
    setAttachments([]);
    setGateReason(null);
    setChatId(null);
  }

  /**
   * Reopens a stored transcript. The tool is restored from the chat's own
   * tool_id, so continuing an old thread starts on the model it was made with
   * rather than on whatever happened to be selected.
   */
  async function openChat(id: string) {
    if (id === chatId || loadingChat) return;
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/playground/chats/${id}`);
      const data = await res.json();
      if (data.error) return;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setChatId(data.id);
      setAttachments([]);
      setGateReason(null);
      const tool = findTool(data.toolId)?.tool;
      if (tool && tool.status === "live") setActiveTool(tool);
    } catch {
      // Leave the current thread on screen — silently swapping it for an empty
      // one would look like the old chat had been deleted.
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <ChatHistory
        activeChatId={chatId}
        refreshKey={historyKey}
        onOpenChat={openChat}
        onNewChat={newChat}
      />

      {/* One row: brand · model picker · balance · way out. The picker doubles
          as the "which AI am I talking to" readout, so no second nav row and
          no floating badge over the canvas are needed. */}
      <header className="sticky top-0 z-20 bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
          <Logo light disableLink className="shrink-0" />
          <span aria-hidden className="hidden h-7 w-[2px] shrink-0 bg-outline-variant sm:block" />
          <ModelPicker activeTool={activeTool} onSelect={selectTool} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <OreMeter remaining={remaining} />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={newChat}
                title="Yeni sohbet"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-2.5 text-xs font-medium text-on-surface-variant transition hover:border-outline hover:bg-surface-container hover:text-on-surface sm:px-3"
              >
                <SquarePen className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Yeni sohbet</span>
              </button>
            )}
            <Link
              href="/dashboard"
              title="Panele dön"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-2.5 text-xs font-medium text-on-surface-variant transition hover:border-outline hover:bg-surface-container hover:text-on-surface sm:px-3"
            >
              <ArrowLeft className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Panel</span>
            </Link>
          </div>
        </div>
        {/* Hairline that fades out at both ends — a hard full-width rule is
            what made the old bar read as a stock template block. */}
        <div aria-hidden className="h-[3px] bg-surface-lowest" />
      </header>

      <div
        className="relative mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4 pt-6"
        style={{ paddingBottom: composerHeight || 16 }}
      >
        {/* Empty state owns the whole canvas and centres itself; the moment a
            conversation exists it gets out of the way entirely. */}
        {messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-8 text-center duration-500 animate-in fade-in-0 slide-in-from-bottom-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Ne üretmek istersin?</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              Yukarıdaki model kutusuna dokun — kategorilere ya da müfredat haftalarına göre gez, sana uyan yapay zekayı seç.
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
            <div className="space-y-6">
              {messages.map((m, i) =>
                m.kind === "switch" ? (
                  <ModelSwitchMarker key={i} toolId={m.toolId} />
                ) : (
                  <Bubble
                    key={i}
                    msg={m}
                    tool={findTool(m.toolId ?? "")?.tool ?? activeTool}
                    // Same reason as setLastAssistant: a marker appended while
                    // a video renders must not steal the typing indicator from
                    // the bubble that's actually still waiting.
                    busy={busy && i === pendingIndex}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {gated && <GatedCallout gateReason={gateReason} />}
      </div>

      <Composer
        input={input}
        setInput={setInput}
        onSend={send}
        busy={busy}
        gated={gated}
        attachments={attachments}
        setAttachments={setAttachments}
        maxImages={maxImages}
        pendingCost={pendingCost}
        baseCost={activeTool.oreCost}
        onHeightChange={setComposerHeight}
        placeholder={findTool(activeTool.id)?.category?.id === "web" ? "Hayalindeki siteyi, oyunu tarif et..." : "Bir şeyler hayal et..."}
      />

      {/* Toast: a tool that isn't wired up yet. Model changes no longer
          need one — they leave a permanent marker in the thread instead. */}
      {notice && (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-2 rounded-full border border-secondary/25 bg-surface-high px-4 py-2.5 text-center text-sm text-on-surface">
            <Lock className="size-3.5 shrink-0 text-secondary" />
            <span>
              <strong className="font-medium">{notice.tool}</strong> çok yakında burada olacak.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Remaining balance. Amber-tinted rather than neutral because this is the
 * playground's currency, and the number re-mounts on every change so a spend
 * registers visually instead of silently ticking down.
 */
function OreMeter({ remaining }: { remaining: number }) {
  return (
    <span
      title={`${formatOre(remaining)} cevher kaldı`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary/10 pl-2.5 pr-3"
    >
      <Zap className="size-3.5 shrink-0 fill-secondary text-secondary" />
      <span key={remaining} className="font-mono text-xs font-semibold leading-none tabular-nums text-secondary-bright duration-300 animate-in fade-in-0 zoom-in-95">
        {formatOre(remaining)}
      </span>
      <span className="hidden text-[11px] leading-none text-secondary/70 sm:inline">cevher</span>
    </span>
  );
}

/** Tab in the model picker's header — hover switches, no click needed. */
function PickerTab({ icon: Icon, label, active, onSelect }: { icon: LucideIcon; label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] transition",
        active ? "bg-secondary/15 text-secondary-bright" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
      )}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

/** Row style shared by the picker's left-hand list, whichever tab is showing. */
function sideItemClass(active: boolean): string {
  return cn(
    "rounded-lg px-2.5 py-2 text-left transition",
    active ? "bg-secondary/15 text-secondary-bright" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
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
        active ? "border-secondary/40 bg-secondary/12" : "border-outline-variant bg-surface-container hover:border-outline-variant hover:bg-surface-high",
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
 * The header's centrepiece: a chip showing which AI is currently answering
 * (logo, name, what a turn costs) that opens the whole catalog on hover.
 *
 * It replaces three separate pieces of UI — a "Kategori" pill, a "Müfredat"
 * pill, and a floating "selected tool" badge above the composer — because
 * they were all facets of one question: which model am I talking to. Browsing
 * by category and browsing by curriculum week are now two tabs of the same
 * two-pane box: a list on the left (live-updates on hover, no click needed)
 * and that entry's model grid on the right.
 */
function ModelPicker({ activeTool, onSelect }: { activeTool: PlaygroundTool; onSelect: (tool: PlaygroundTool) => void }) {
  const { open, setOpen, hoverProps } = useHoverPopover();
  const [mode, setMode] = useState<"category" | "curriculum">("category");

  const activeCategoryId = CATEGORY_MENU_ENTRIES.find((e) => e.id !== "all" && e.tools.some((t) => t.id === activeTool.id))?.id ?? "all";
  const activeMonth =
    CURRICULUM_MONTHS.find((m) => weeksInMonth(m.month).some((w) => resolveWeekTools(w).some((t) => t.id === activeTool.id)))?.month ??
    CURRICULUM_MONTHS[0].month;

  const [category, setCategory] = useState(activeCategoryId);
  const [month, setMonth] = useState(activeMonth);
  const shownCategory = CATEGORY_MENU_ENTRIES.find((e) => e.id === category) ?? CATEGORY_MENU_ENTRIES[0];

  // Re-opening lands on wherever the current model actually lives, not on
  // wherever the pointer happened to leave the list last time.
  function syncToActive() {
    setCategory(activeCategoryId);
    setMonth(activeMonth);
  }

  function pick(tool: PlaygroundTool) {
    onSelect(tool);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={() => {
            syncToActive();
            hoverProps.onMouseEnter();
          }}
          onMouseLeave={hoverProps.onMouseLeave}
          onClick={syncToActive}
          title={`${activeTool.name} — ${activeTool.description}`}
          className={cn(
            "flex h-9 min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-left transition sm:pr-2.5",
            open
              ? "border-secondary/45 bg-secondary/12"
              : "border-outline-variant bg-surface-container hover:border-outline hover:bg-surface-high",
          )}
        >
          {activeTool.provider ? (
            <ProviderBadge provider={activeTool.provider} className="size-7" />
          ) : (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
              <activeTool.icon className="size-3.5" />
            </span>
          )}
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[13px] font-semibold leading-none text-on-surface">{activeTool.name}</span>
            <span className="hidden truncate font-mono text-[10px] leading-none text-secondary-bright/70 sm:block">{oreLabel(activeTool)}</span>
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-on-surface-variant transition duration-200", open && "rotate-180 text-secondary")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        {...hoverProps}
        className="pg-dialog w-[min(680px,94vw)] gap-0 overflow-hidden p-0 ring-0"
      >
        <div className="flex items-center gap-1 border-b border-outline-variant px-2 py-1.5">
          <PickerTab icon={LayoutGrid} label="Kategoriler" active={mode === "category"} onSelect={() => setMode("category")} />
          <PickerTab icon={CalendarDays} label="Müfredat" active={mode === "curriculum"} onSelect={() => setMode("curriculum")} />
        </div>

        <div className="flex h-72 flex-row sm:h-80">
          <div className="flex w-28 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-outline-variant p-2 sm:w-36">
            {mode === "category"
              ? CATEGORY_MENU_ENTRIES.map((entry) => {
                  const Icon = CATEGORY_ICONS[entry.id] ?? Layers;
                  return (
                    <button
                      key={entry.id}
                      onMouseEnter={() => setCategory(entry.id)}
                      onFocus={() => setCategory(entry.id)}
                      onClick={() => setCategory(entry.id)}
                      className={cn("flex items-center gap-2 font-mono text-[11px]", sideItemClass(category === entry.id))}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  );
                })
              : CURRICULUM_MONTHS.map((m) => {
                  const [ayLabel, subtitle] = m.label.split(" · ");
                  return (
                    <button
                      key={m.month}
                      onMouseEnter={() => setMonth(m.month)}
                      onFocus={() => setMonth(m.month)}
                      onClick={() => setMonth(m.month)}
                      className={cn("flex flex-col gap-0.5", sideItemClass(month === m.month))}
                    >
                      <span className="font-mono text-[11px] font-semibold">{ayLabel}</span>
                      <span className="line-clamp-2 text-[9px] leading-snug opacity-80">{subtitle}</span>
                    </button>
                  );
                })}
          </div>

          {mode === "category" ? (
            <div
              key={shownCategory.id}
              className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto p-2.5 duration-150 animate-in fade-in-0 slide-in-from-left-1 sm:grid-cols-3"
            >
              {shownCategory.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} active={tool.id === activeTool.id} onSelect={() => pick(tool)} />
              ))}
            </div>
          ) : (
            <div key={month} className="flex-1 space-y-3 overflow-y-auto p-2.5 duration-150 animate-in fade-in-0 slide-in-from-left-1">
              {weeksInMonth(month).map((week) => (
                <div key={week.week}>
                  <div className="mb-1.5 flex items-baseline gap-1.5">
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-secondary">Hafta {week.week}</span>
                    <span className="truncate text-[11px] font-semibold">{week.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {resolveWeekTools(week).map((tool) => (
                      <ToolCard key={tool.id} tool={tool} active={tool.id === activeTool.id} onSelect={() => pick(tool)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GatedCallout({ gateReason }: { gateReason: GateReason }) {
  const gatedMessage =
    gateReason === "login_required"
      ? "Video oluşturma sadece giriş yapmış öğrenciler için açık."
      : "Ücretsiz deneme hakkın bitti. Öğrenci olarak çok daha fazlasını üret!";

  return (
    <div className="pg-card flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Lock className="size-5" />
        </span>
        <p className="text-sm text-on-surface-variant">{gatedMessage}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/dashboard" className="rounded-full border border-outline-variant px-4 py-2 font-mono text-sm text-on-surface transition hover:border-secondary/40">
          Panele dön
        </Link>
        <Link
          href={whatsappHref()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-mono text-sm font-semibold text-on-secondary transition hover:brightness-110"
        >
          <WhatsappIcon className="size-4" />
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
  attachments,
  setAttachments,
  maxImages,
  pendingCost,
  baseCost,
  placeholder,
  onHeightChange,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  gated: boolean;
  attachments: string[];
  setAttachments: (updater: (prev: string[]) => string[]) => void;
  maxImages: number;
  pendingCost: number;
  baseCost: number;
  placeholder: string;
  onHeightChange: (height: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const canAttach = maxImages > 0;
  const full = attachments.length >= maxImages;

  // Grow the box with the text instead of scrolling a one-line slot. Height
  // has to go back to `auto` first, otherwise scrollHeight can only ever
  // report the current (already grown) height and the box never shrinks
  // again after a delete or a send. The CSS max-height caps it and hands
  // over to scrolling from there.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input, attachments.length]);

  /** Shared by the file picker, paste and drop — all three end up here. */
  async function addFiles(files: FileList | File[]) {
    const room = maxImages - attachments.length;
    if (room <= 0) return;
    const encoded = await Promise.all(Array.from(files).slice(0, room).map(toAttachmentDataUrl));
    const usable = encoded.filter((v): v is string => v !== null);
    if (usable.length > 0) setAttachments((prev) => [...prev, ...usable].slice(0, maxImages));
  }

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
          onDragOver={(e) => {
            if (!canAttach) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (!canAttach) return;
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "pg-card flex flex-col gap-2 p-2 transition-colors",
            dragging && "bg-secondary/15",
          )}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {attachments.map((src, i) => (
                <div key={i} className="group/thumb relative animate-in fade-in-0 zoom-in-95">
                  {/* eslint-disable-next-line @next/next/no-img-element -- client-side data URL, never a remote asset */}
                  <img src={src} alt="" className="size-16 rounded-lg border border-outline-variant object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Görseli kaldır"
                    className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-outline-variant bg-surface text-on-surface-variant transition hover:text-on-surface"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {canAttach && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple={maxImages > 1}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    // Reset so picking the same file twice in a row still fires onChange.
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={full || busy}
                  aria-label="Görsel ekle"
                  title={full ? `En fazla ${maxImages} görsel` : "Görsel ekle"}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition hover:border-secondary/40 hover:text-on-surface disabled:opacity-40"
                >
                  <ImagePlus className="size-4" />
                </button>
              </>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                if (!canAttach) return;
                const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                if (files.length === 0) return;
                // Only swallow the paste when it really carried an image —
                // otherwise a normal text paste would be eaten.
                e.preventDefault();
                void addFiles(files);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(input);
                }
              }}
              rows={1}
              placeholder={placeholder}
              // leading-6 + py-2 makes one line exactly 40px — the same height
              // as the attach/send buttons it sits between.
              className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Gönder"
              className="pg-btn inline-flex size-10 shrink-0 items-center justify-center transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
        <p className="mt-2 text-center font-mono text-[11px] text-on-surface-variant/50">
          {pendingCost > baseCost
            ? `Görselli mesaj — ${formatOre(pendingCost)} cevher`
            : "Gerçek yapay zeka ile üretiliyor — biraz zaman alabilir"}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline marker for "the model changed here".
 *
 * The caption is modality-driven, and the distinction is real rather than
 * decorative. OpenRouter is stateless: nothing is remembered on their side,
 * and a model only "remembers" what we resend to it. This app resends the
 * whole running transcript for text tools — every turn of it, no matter which
 * model wrote which line — so a text model picked up mid-thread reads the
 * entire conversation above, including the parts other models produced, and
 * a model returning after a detour reads its own earlier lines back. The only
 * thing it can't see is what has already fallen out of the last-HISTORY_LIMIT
 * window.
 *
 * Image, video and audio tools are one-shot generations: `send()` sends them
 * no history at all, only the prompt typed next. Telling a student their new
 * video model "continues the conversation" would be plainly false, hence the
 * two different sentences.
 */
function ModelSwitchMarker({ toolId }: { toolId?: string }) {
  const tool = findTool(toolId ?? "")?.tool;
  if (!tool) return null;

  const readsHistory = tool.modality === "text";

  return (
    <div className="flex flex-col items-center gap-2 py-1" aria-live="polite">
      <div className="flex w-full items-center gap-3">
        <span aria-hidden className="h-[2px] flex-1 bg-outline-variant" />
        <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-high py-1 pl-1 pr-3">
          {tool.provider ? (
            <ProviderBadge provider={tool.provider} className="size-6" />
          ) : (
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
              <tool.icon className="size-3" />
            </span>
          )}
          <span className="font-mono text-xs font-medium text-on-surface">{tool.name}</span>
        </span>
        <span aria-hidden className="h-[2px] flex-1 bg-outline-variant" />
      </div>
      <p className="max-w-[46ch] text-center text-xs leading-relaxed text-on-surface-variant">
        {readsHistory
          ? `Sohbet buradan ${tool.name} ile devam ediyor — yukarıda yazılan her şeyi (son ${HISTORY_LIMIT} mesaj) okuyabiliyor, hangi modelin yazdığı fark etmiyor.`
          : `${tool.name} sohbeti okumuyor — yalnızca bundan sonra yazacağın mesajı görüyor.`}
      </p>
    </div>
  );
}

function Bubble({ msg, tool, busy }: { msg: Msg; tool: PlaygroundTool; busy: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const hasMedia = !!msg.imageUrl || !!msg.videoUrl || !!msg.audioUrl;

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser ? "justify-end animate-msg-in-right" : "justify-start animate-msg-in-left",
      )}
    >
      {/* Who is answering, shown once per turn. Switching models wipes the
          transcript, so every message on screen belongs to this tool. */}
      {!isUser &&
        (tool.provider ? (
          <ProviderBadge provider={tool.provider} className="mt-0.5 size-7 ring-1 ring-white/10" />
        ) : (
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
            <tool.icon className="size-3.5" />
          </span>
        ))}
      <div className={cn("group relative min-w-0 max-w-[85%]", !isUser && "flex-1 sm:w-auto sm:max-w-[85%] sm:flex-none")}>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
            {msg.attachments.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- client-side data URL, never a remote asset
              <img key={i} src={src} alt="" className="size-24 rounded-xl border border-outline-variant object-cover" />
            ))}
          </div>
        )}
        {msg.imageUrl ? (
          <img
            src={msg.imageUrl}
            alt=""
            className="pg-card max-h-96 rounded-tl-sm object-contain transition duration-300 hover:scale-[1.01]"
          />
        ) : msg.videoUrl ? (
          <video src={msg.videoUrl} controls className="pg-card max-h-96 rounded-tl-sm" />
        ) : msg.audioUrl ? (
          <audio src={msg.audioUrl} controls className="w-full max-w-xs rounded-full" />
        ) : msg.kind === "code" && msg.content ? (
          <CodeOutputView html={msg.content} />
        ) : (
          <div
            className={cn(
              // 62ch keeps a reply at a readable measure instead of letting it
              // run the full 85% of a wide desktop canvas.
              "max-w-[62ch] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "rounded-br-sm border border-secondary/20 bg-secondary/12 text-secondary-bright"
                : "rounded-tl-sm border border-outline-variant bg-surface-high/60 text-on-surface",
            )}
          >
            {msg.content ? (
              // Keyed so the answer fades in as it replaces the dots, rather
              // than snapping into place.
              <span key="content" className="duration-300 animate-in fade-in-0">
                {msg.content}
              </span>
            ) : (
              busy && (msg.videoPending ? <VideoWaitNotice /> : <TypingDots />)
            )}
          </div>
        )}
        {!isUser && !busy && msg.kind !== "code" && (msg.content || hasMedia) && (
          <button
            onClick={() => {
              if (hasMedia) {
                window.open(msg.imageUrl ?? msg.videoUrl ?? msg.audioUrl, "_blank", "noopener,noreferrer");
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
            className="absolute -bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-2 py-1 font-mono text-[10px] text-on-surface-variant opacity-100 shadow-sm transition duration-200 hover:border-secondary/40 hover:text-on-surface sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
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
    <div className="pg-card w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant px-2 py-1.5">
        <div className="inline-flex gap-0.5 rounded-full bg-surface-container p-0.5 font-mono text-[10px]">
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
            className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
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
            className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
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
    <span className="inline-flex items-center gap-1 py-1">
      <span className="size-1.5 animate-typing-dot rounded-full bg-secondary" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-secondary [animation-delay:160ms]" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-secondary [animation-delay:320ms]" />
    </span>
  );
}
