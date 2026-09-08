"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Brain, Check, ChevronDown, Columns2, Copy, Download, Eraser, Expand } from "lucide-react";
import { cn } from "@/lib/cn";
import { findTool, type PlaygroundTool } from "@/lib/playground/tools";
import { cutOutBackground } from "@/lib/playground/cutout";
import { ProviderBadge } from "./provider-logos";
import type { ViewerItem } from "./media-viewer";
import type { Msg } from "./types";

/**
 * react-markdown + rehype-highlight (and the language grammars it drags in)
 * are the heaviest thing on this route, and an image session never renders a
 * line of markdown. Loaded on first use, so the picture-first student pays
 * nothing for them.
 */
const loadMarkdown = () => import("./markdown");
const Markdown = dynamic(() => loadMarkdown().then((m) => m.Markdown), {
  ssr: false,
  loading: () => <TypingDots />,
});
/** Warms the markdown chunk the moment a text model is on screen, so the first answer never waits for it. */
export function preloadMarkdown() {
  void loadMarkdown();
}

/** Keep in sync with HISTORY_LIMIT in app/api/playground/generate/route.ts. */
export const HISTORY_LIMIT = 20;

/** The model's avatar, or a neutral glyph for a tool with no brand. */
export function ToolAvatar({ tool, className, iconClassName }: { tool: PlaygroundTool; className?: string; iconClassName?: string }) {
  if (tool.provider) {
    return <ProviderBadge provider={tool.provider} className={cn("shadow-none ring-1 ring-[color:var(--pn-hair-strong)]", className)} />;
  }
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface-low text-on-surface-variant", className)}>
      <tool.icon className={iconClassName ?? "size-3.5"} />
    </span>
  );
}

/**
 * The model thinking out loud, above its answer.
 *
 * Open while it is the only thing on screen and closed once real words start
 * arriving — watching a model reason is the point right up until there is an
 * actual reply to read, at which point an expanded panel just pushes the reply
 * out of view. `manual` freezes that at whatever the student last chose, so a
 * panel they opened deliberately does not slam shut under them.
 */
function ReasoningPanel({ text, live }: { text: string; live: boolean }) {
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? live;

  return (
    <div className="mb-1.5 overflow-hidden rounded-[12px] border border-[color:var(--pn-hair)] bg-surface-low">
      <button
        type="button"
        onClick={() => setManual(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <Brain className={cn("size-3.5 shrink-0 text-[color:var(--pn-violet-ink)]", live && "animate-pulse")} strokeWidth={1.9} />
        <span>{live ? "Düşünüyor…" : "Nasıl düşündü"}</span>
        <ChevronDown className={cn("ml-auto size-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto border-t border-[color:var(--pn-hair)] px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-on-surface-variant">
          {text}
        </div>
      )}
    </div>
  );
}

/** Shared by the small actions that hang under a bubble. */
const BUBBLE_ACTION_CLASS =
  "inline-flex h-7 items-center gap-1 rounded-[8px] border border-[color:var(--pn-hair-strong)] bg-surface-container px-2 font-mono text-[10px] font-semibold text-on-surface-variant shadow-[var(--pn-shadow-lift)] transition-colors hover:bg-[color:var(--pn-blue-tint)] hover:text-on-surface disabled:opacity-50";

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {/* One dot per accent rather than three of the same: a row of identical
          dots reads as a loading spinner, and this reads as the product. */}
      <span className="size-1.5 animate-typing-dot rounded-full bg-[color:var(--pn-mint-ink)]" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-[color:var(--pn-peach-ink)] [animation-delay:160ms]" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-[color:var(--pn-pink-ink)] [animation-delay:320ms]" />
    </span>
  );
}

function VideoWaitNotice() {
  return (
    <span className="inline-flex items-center gap-2 py-1 text-on-surface-variant">
      <TypingDots /> Video oluşturuluyor, bu biraz zaman alabilir...
    </span>
  );
}

/** Models tend to wrap their HTML in a ```html fence despite being told not to — strip it if present. */
export function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)\n?```/i);
  return (fenced ? fenced[1] : raw).trim();
}

export function CodeOutputView({
  html,
  toolName,
  onView,
}: {
  html: string;
  toolName: string;
  onView: (item: ViewerItem) => void;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const source = extractHtml(html);

  return (
    <div className="pn-card w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--pn-hair)] px-2 py-1.5">
        <div className="inline-flex gap-0.5 rounded-[9px] bg-surface-low p-0.5 font-mono text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn("rounded-[7px] px-2.5 py-1 transition-colors", tab === "preview" ? "bg-[color:var(--pn-navy)] text-[color:var(--pn-on-navy)]" : "text-on-surface-variant")}
          >
            Önizleme
          </button>
          <button
            type="button"
            onClick={() => setTab("code")}
            className={cn("rounded-[7px] px-2.5 py-1 transition-colors", tab === "code" ? "bg-[color:var(--pn-navy)] text-[color:var(--pn-on-navy)]" : "text-on-surface-variant")}
          >
            Kod
          </button>
        </div>
        <div className="flex gap-1">
          {tab === "preview" && (
            <button
              type="button"
              onClick={() => onView({ kind: "web", html: source, title: `${toolName} — önizleme` })}
              aria-label="Büyüt"
              title="Tam ekran aç"
              className="inline-flex size-7 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
            >
              <Expand className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(source);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label="Kopyala"
            className="inline-flex size-7 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
          <button
            type="button"
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
            className="inline-flex size-7 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>
      {tab === "preview" ? (
        // No allow-same-origin: model-written code must never reach the session.
        <iframe srcDoc={source} sandbox="allow-scripts" title="Önizleme" className="h-80 w-full bg-white sm:h-96" />
      ) : (
        <pre className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-on-surface-variant">
          <code>{source}</code>
        </pre>
      )}
    </div>
  );
}

export function Bubble({
  msg,
  tool,
  busy,
  onView,
  column = false,
}: {
  msg: Msg;
  tool: PlaygroundTool;
  busy: boolean;
  /** Opens this turn's output full-screen. */
  onView: (item: ViewerItem) => void;
  /**
   * Drawn inside one half of a comparison rather than in the flow.
   *
   * The column has its own header naming the model, so the avatar here would
   * say it twice; and the 85% cap that keeps a reply off the far edge of a
   * wide canvas would leave a gap down the middle of an already-narrow column.
   */
  column?: boolean;
}) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const hasMedia = !!msg.imageUrl || !!msg.videoUrl || !!msg.audioUrl;
  /**
   * The cut-out version of this picture, once the student asks for one.
   *
   * Local to the bubble and deliberately not persisted: it is an export step
   * on the way to WhatsApp, not a new generation. Reopening the chat shows the
   * original again, which is the truthful thing — the original is what the
   * model made and what we stored.
   */
  const [cutout, setCutout] = useState<{ url: string; removed: number } | null>(null);
  const [cutting, setCutting] = useState<"idle" | "working" | "failed">("idle");

  // Revoking on unmount rather than on replace: the <img> is still showing it.
  useEffect(() => () => { if (cutout) URL.revokeObjectURL(cutout.url); }, [cutout]);

  async function cutBackground() {
    if (!msg.imageUrl || cutting === "working") return;
    setCutting("working");
    const result = await cutOutBackground(msg.imageUrl).catch(() => null);
    if (!result) {
      setCutting("failed");
      return;
    }
    setCutout({ url: URL.createObjectURL(result.blob), removed: result.removed });
    setCutting("idle");
  }

  function downloadMedia() {
    // A cut-out only exists as a blob in this tab, so it needs a real download
    // (with a name WhatsApp will accept) rather than being opened in a tab.
    if (cutout) {
      const a = document.createElement("a");
      a.href = cutout.url;
      a.download = "sticker.png";
      a.click();
      return;
    }
    window.open(msg.imageUrl ?? msg.videoUrl ?? msg.audioUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("flex gap-2.5", column ? "justify-start" : isUser ? "justify-end animate-msg-in-right" : "justify-start animate-msg-in-left")}>
      {/* Who is answering, shown once per turn — a message keeps the avatar of
          the model that actually wrote it, so changing model mid-thread never
          re-attributes the answers above. */}
      {!isUser && !column && <ToolAvatar tool={tool} className="mt-0.5 size-7" />}
      <div className={cn("group relative min-w-0", column ? "w-full" : "max-w-[85%]", !isUser && !column && "flex-1 sm:w-auto sm:max-w-[85%] sm:flex-none")}>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
            {msg.attachments.map((src, i) => (
              // A data: URL held in this tab, never a routable asset the optimizer could fetch.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="size-24 rounded-[12px] border border-[color:var(--pn-hair-strong)] object-cover" />
            ))}
          </div>
        )}
        {msg.reasoning && <ReasoningPanel text={msg.reasoning} live={busy && !msg.content} />}
        {msg.imageUrl ? (
          // The transcript keeps pictures small so a conversation still reads
          // as one; the picture is the product, so the whole thing is the
          // button that opens it properly.
          <button
            type="button"
            onClick={() => onView({ kind: "image", url: msg.imageUrl!, blobUrl: cutout?.url, title: tool.name })}
            aria-label="Görseli büyüt"
            className="block cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed/blob URL of what the student just generated */}
            <img
              src={cutout?.url ?? msg.imageUrl}
              alt=""
              className={cn(
                "max-h-96 rounded-[16px] border border-[color:var(--pn-hair-strong)] object-contain shadow-[var(--pn-shadow-card)] transition duration-300 hover:scale-[1.01]",
                cutout && "pg-checker",
              )}
            />
          </button>
        ) : msg.videoUrl ? (
          <div className="relative">
            <video src={msg.videoUrl} controls className="max-h-96 rounded-[16px] border border-[color:var(--pn-hair-strong)]" />
            <button
              type="button"
              onClick={() => onView({ kind: "video", url: msg.videoUrl!, title: tool.name })}
              aria-label="Videoyu büyüt"
              title="Büyüt"
              className="pg-stage-btn absolute right-2 top-2 !size-8"
            >
              <Expand className="size-3.5" />
            </button>
          </div>
        ) : msg.audioUrl ? (
          <div className="flex items-center gap-2">
            <audio src={msg.audioUrl} controls className="w-full max-w-xs" />
            <button
              type="button"
              onClick={() => onView({ kind: "audio", url: msg.audioUrl!, title: tool.name })}
              aria-label="Sesi büyüt"
              title="Büyüt"
              className="pg-stage-btn !size-8"
            >
              <Expand className="size-3.5" />
            </button>
          </div>
        ) : msg.kind === "code" && msg.content ? (
          <CodeOutputView html={msg.content} toolName={tool.name} onView={onView} />
        ) : (
          <div
            className={cn(
              // 62ch keeps a reply at a readable measure instead of letting it
              // run the full 85% of a wide desktop canvas.
              "break-words rounded-[16px] px-4 py-3 text-[14px] leading-relaxed",
              column ? "w-full" : "max-w-[62ch]",
              isUser
                // The student's own text is shown exactly as typed: parsing it
                // as markdown would reformat their words under them.
                // Light blue is the student's own voice throughout; peach stays
                // reserved for value and actions (ore, send, the selected model).
                ? "whitespace-pre-wrap rounded-br-[6px] bg-[color:var(--pn-blue)] text-[color:var(--pn-blue-ink-strong)]"
                : "rounded-tl-[6px] border border-[color:var(--pn-hair)] bg-surface-container text-on-surface shadow-[var(--pn-shadow-card)]",
            )}
          >
            {msg.content ? (
              // Keyed so the answer fades in as it replaces the dots.
              <span key="content" className="block duration-300 animate-in fade-in-0">
                {isUser ? msg.content : <Markdown content={msg.content} />}
              </span>
            ) : (
              busy && (msg.videoPending ? <VideoWaitNotice /> : <TypingDots />)
            )}
          </div>
        )}
        {!isUser && !busy && msg.kind !== "code" && (msg.content || hasMedia) && (
          // Touch devices have no hover state — always visible below sm, and
          // hide-until-hover only where there is a pointer.
          <div className="absolute -bottom-3 left-3 flex items-center gap-1.5 opacity-100 transition duration-200 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={
                hasMedia
                  ? downloadMedia
                  : () => {
                      navigator.clipboard.writeText(msg.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }
              }
              aria-label={hasMedia ? "İndir" : "Kopyala"}
              className={BUBBLE_ACTION_CLASS}
            >
              {hasMedia ? (
                <>
                  <Download className="size-3" /> {cutout ? "PNG indir" : "İndir"}
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
            {/* Hafta 1'in teslim adımı: sticker paketi ancak arka planı
                temizlenmiş şeffaf PNG olarak WhatsApp'a eklenebiliyor. */}
            {msg.imageUrl && !cutout && (
              <button
                type="button"
                onClick={cutBackground}
                disabled={cutting === "working"}
                aria-label="Arka planı sil"
                title="Arka planı sil — sticker olarak kaydedebilmen için şeffaf PNG yapar"
                className={BUBBLE_ACTION_CLASS}
              >
                <Eraser className="size-3" />
                {cutting === "working" ? "siliniyor…" : cutting === "failed" ? "olmadı, tekrar dene" : "Arka planı sil"}
              </button>
            )}
            {cutout && (
              <span
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-[8px] border px-2 font-mono text-[10px] font-semibold",
                  // A cut that took almost nothing or almost everything is a cut
                  // that went wrong — say so instead of letting the student
                  // download an empty PNG and find out on their phone.
                  cutout.removed < 0.05 || cutout.removed > 0.9
                    ? "border-[color:var(--pn-pink-line)] text-[color:var(--pn-pink-ink)]"
                    : "border-[color:var(--pn-hair-strong)] text-on-surface-variant",
                )}
              >
                {cutout.removed < 0.05
                  ? "arka plan düz değil, silinemedi"
                  : cutout.removed > 0.9
                    ? 'fazlasını sildi — tarife "sade arka plan" ekle'
                    : `arka plan silindi · %${Math.round(cutout.removed * 100)}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A comparison turn: one prompt, two models, drawn as two columns.
 *
 * Each column names its own model rather than relying on the avatar the
 * ordinary transcript uses, because the whole point of the row is which one
 * made which. Side by side only where there is room: below `sm` the columns
 * stack, which is the only honest layout on a phone.
 */
export function ComparePair({
  left,
  right,
  pendingIds,
  fallbackTool,
  onView,
}: {
  left: Msg;
  right: Msg;
  pendingIds: string[];
  fallbackTool: PlaygroundTool;
  onView: (item: ViewerItem) => void;
}) {
  const sides = [left, right].map((msg) => ({
    msg,
    tool: findTool(msg.toolId ?? "")?.tool ?? fallbackTool,
    busy: !!msg.id && pendingIds.includes(msg.id),
  }));

  return (
    <div className="animate-msg-in-left">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
        <Columns2 className="size-3 shrink-0" />
        Karşılaştırma
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map(({ msg, tool, busy }, i) => (
          <div key={msg.id ?? i} className="min-w-0 rounded-[16px] border border-[color:var(--pn-hair)] bg-surface-low/60 p-2.5">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <ToolAvatar tool={tool} className="size-6" iconClassName="size-3" />
              <span className="truncate text-[13px] font-semibold text-on-surface">{tool.name}</span>
              {/* Letters rather than 1/2 so it never reads as a ranking. */}
              <span className="ml-auto shrink-0 font-mono text-[10px] font-semibold text-on-surface-variant">{i === 0 ? "A" : "B"}</span>
            </div>
            <Bubble msg={msg} tool={tool} busy={busy} onView={onView} column />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline marker for "the model changed here".
 *
 * The caption is modality-driven, and the distinction is real rather than
 * decorative: text tools are resent the whole running transcript, so a text
 * model picked up mid-thread reads everything above; image/video/audio tools
 * never read the transcript at all — what they can carry, with memory on, is
 * the last picture this chat produced, which is a third thing and gets its own
 * sentence.
 */
export function ModelSwitchMarker({ toolId, memory }: { toolId?: string; memory: boolean }) {
  const tool = findTool(toolId ?? "")?.tool;
  if (!tool) return null;

  const readsHistory = tool.modality === "text";
  const carriesImage = !readsHistory && (tool.maxImageInputs ?? 0) > 0;

  const caption = readsHistory
    ? memory
      ? `Sohbet buradan ${tool.name} ile devam ediyor — yukarıda yazılan her şeyi (son ${HISTORY_LIMIT} mesaj) okuyabiliyor, hangi modelin yazdığı fark etmiyor.`
      : `Sohbet buradan ${tool.name} ile devam ediyor — ama hafıza kapalı, yalnızca bundan sonra yazacağın mesajı görecek.`
    : carriesImage && memory
      ? `${tool.name} yazışmayı okumuyor — ama hafıza açık, bu sohbette ürettiğin son görselden devam edebiliyor.`
      : `${tool.name} sohbeti okumuyor — yalnızca bundan sonra yazacağın mesajı görüyor.`;

  return (
    <div className="flex flex-col items-center gap-2 py-1" aria-live="polite">
      <div className="flex w-full items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-[color:var(--pn-hair-strong)]" />
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--pn-hair-strong)] bg-surface-container py-1 pl-1 pr-3">
          <ToolAvatar tool={tool} className="size-6" iconClassName="size-3" />
          <span className="font-mono text-[11px] font-semibold text-on-surface">{tool.name}</span>
        </span>
        <span aria-hidden className="h-px flex-1 bg-[color:var(--pn-hair-strong)]" />
      </div>
      <p className="max-w-[46ch] text-center text-[12px] leading-relaxed text-on-surface-variant">{caption}</p>
    </div>
  );
}
