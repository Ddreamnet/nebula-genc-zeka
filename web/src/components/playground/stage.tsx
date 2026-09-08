"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Columns2, Download, Expand, Music2, Pencil, RefreshCw, Shuffle, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { findTool, type PlaygroundTool } from "@/lib/playground/tools";
import { studioFields, type Role, type StudioParams } from "@/lib/playground/params";
import type { Row } from "@/lib/playground/transcript";
import type { ViewerItem } from "./media-viewer";
import { Bubble, ComparePair, ModelSwitchMarker, ToolAvatar, TypingDots, CodeOutputView, preloadMarkdown } from "./transcript";
import type { Msg, StageItem } from "./types";

export type StageMode = "empty" | "gallery" | "transcript";

export interface StageActions {
  onRegenerate: (item: StageItem) => void;
  onVariation: (item: StageItem, reply: Msg) => void;
  onEdit: (item: StageItem, reply: Msg) => void;
  onDownload: (reply: Msg) => void;
  onCompare: () => void;
  compareOn: boolean;
  compareAvailable: boolean;
  /** The active model accepts a reference picture — variation and edit need one. */
  canReference: boolean;
  /** Loads the settings a past result was made with back into the studio. */
  onRestoreParams: (reply: Msg) => void;
  /** Whose labels to write the settings chip in. */
  role: Role;
  disabled: boolean;
}

/**
 * The centre of the Playground: what the student is looking at.
 *
 * Three faces, chosen by what the active model makes. A text model gets a
 * transcript, because a conversation is the product. An image, video or
 * audio model gets a gallery — one output at a time, large, with arrows to
 * walk back through the thread and a floating action bar under it — because
 * there the product is the thing, not the exchange. An empty thread shows
 * NOTHING: a studio opens on an empty canvas, and a page of suggestion chips
 * and a headline is a brochure, not a workspace.
 *
 * There is no card around any of this. The stage used to be a cream panel
 * sitting on the blue ground — a box inside a room — and every output was
 * then framed twice. Now the ground is the canvas and the only surface is
 * the thing the student made.
 */
export function Stage({
  mode,
  tool,
  rows,
  pendingIds,
  memory,
  onView,
  scrollRef,
  onScroll,
  items,
  index,
  onIndex,
  actions,
  footer,
}: {
  mode: StageMode;
  tool: PlaygroundTool;
  /** Transcript mode. */
  rows: Row<Msg>[];
  pendingIds: string[];
  memory: boolean;
  onView: (item: ViewerItem) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (el: HTMLDivElement) => void;
  /** Gallery mode. */
  items: StageItem[];
  index: number;
  onIndex: (index: number) => void;
  actions: StageActions;
  /** Anything pinned under the stage — the balance callout. */
  footer?: ReactNode;
}) {
  // A text model answers in markdown; fetch its renderer before the first
  // token arrives rather than at the moment it does.
  useEffect(() => {
    if (tool.modality === "text") preloadMarkdown();
  }, [tool.modality]);

  return (
    <section className="pg-stage" aria-label="Sahne">
      {mode === "empty" ? (
        // Deliberately empty. The composer below already names the model and
        // holds the cursor; anything drawn here would only be in the way.
        <div className="flex-1" />
      ) : mode === "transcript" ? (
        <div ref={scrollRef} onScroll={(e) => onScroll(e.currentTarget)} className="pg-scroll min-h-0 flex-1">
          <div className="pg-center space-y-6 px-1 pb-2 pt-4 sm:px-4">
            {rows.map((row) =>
              row.kind === "pair" ? (
                <ComparePair key={row.key} left={row.left} right={row.right} pendingIds={pendingIds} fallbackTool={tool} onView={onView} />
              ) : row.msg.kind === "switch" ? (
                <ModelSwitchMarker key={row.key} toolId={row.msg.toolId} memory={memory} />
              ) : (
                <Bubble
                  key={row.key}
                  msg={row.msg}
                  tool={findTool(row.msg.toolId ?? "")?.tool ?? tool}
                  busy={!!row.msg.id && pendingIds.includes(row.msg.id)}
                  onView={onView}
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <Gallery tool={tool} items={items} index={index} onIndex={onIndex} pendingIds={pendingIds} onView={onView} actions={actions} />
      )}
      {footer}
    </section>
  );
}

/** "1024 × 1024", read off the loaded picture rather than guessed from the ratio. */
function useNaturalSize(url: string | undefined) {
  // Keyed by url rather than reset in an effect: a size read off picture A
  // must never be shown under picture B for the frame between the two.
  const [meta, setMeta] = useState<{ url: string; size: string } | null>(null);
  const size = meta && meta.url === url ? meta.size : null;
  return {
    size,
    onLoad: (e: React.SyntheticEvent<HTMLImageElement>) =>
      url && setMeta({ url, size: `${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}` }),
  };
}

function Gallery({
  tool,
  items,
  index,
  onIndex,
  pendingIds,
  onView,
  actions,
}: {
  tool: PlaygroundTool;
  items: StageItem[];
  index: number;
  onIndex: (i: number) => void;
  pendingIds: string[];
  onView: (item: ViewerItem) => void;
  actions: StageActions;
}) {
  const [size, setSize] = useState<string | null>(null);
  const item = items[index];
  const replies = item?.replies ?? [];
  const primary = replies[0];
  const primaryTool = primary ? (findTool(primary.toolId ?? "")?.tool ?? tool) : tool;
  const pending = replies.some((r) => !!r.id && pendingIds.includes(r.id));
  const hasMedia = !!(primary?.imageUrl || primary?.videoUrl || primary?.audioUrl);

  // Arrow keys walk the thread — the stage is the thing a student is looking
  // at, and reaching for the mouse to see the previous one breaks that.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndex]);

  if (!item) return null;

  return (
    <>
      {/* overflow-hidden is load-bearing: a centred flex item that is taller
          than its box spills out of BOTH ends, and without the old card's
          clipping a tall picture used to ride up over the bar. */}
      {/* min-h-0 at every size: a 200px floor on a phone pushed the action
          bar under the composer and out of reach — the picture must give
          way to the controls, never the other way round. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden px-1 py-2 sm:px-2">
        {replies.length === 2 ? (
          <div className="grid h-full w-full min-h-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {replies.map((reply, i) => {
              const t = findTool(reply.toolId ?? "")?.tool ?? tool;
              return (
                <div key={reply.id ?? i} className="relative flex min-h-0 flex-col items-center justify-center gap-2 overflow-hidden">
                  <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[color:var(--pn-hair-strong)] bg-surface-container px-2 py-1 text-[12px] font-semibold text-on-surface">
                    <span className="font-mono text-[10px] text-on-surface-variant">{i === 0 ? "A" : "B"}</span>
                    <ToolAvatar tool={t} className="size-5" iconClassName="size-2.5" />
                    {t.name}
                  </span>
                  <Media reply={reply} tool={t} pending={!!reply.id && pendingIds.includes(reply.id)} onView={onView} compact />
                </div>
              );
            })}
          </div>
        ) : (
          <Media reply={primary} tool={primaryTool} pending={pending} onView={onView} onSize={setSize} />
        )}

        {/* Walk the thread. Disabled, not hidden, at either end: a control
            that vanishes teaches that it is unreliable. */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndex(index - 1)}
              disabled={index === 0}
              aria-label="Önceki üretim"
              className="pg-stage-btn absolute left-2 top-1/2 -translate-y-1/2 sm:left-3"
            >
              <ChevronLeft className="size-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => onIndex(index + 1)}
              disabled={index === items.length - 1}
              aria-label="Sonraki üretim"
              className="pg-stage-btn absolute right-2 top-1/2 -translate-y-1/2 sm:right-3"
            >
              <ChevronRight className="size-5" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Filmstrip: the whole exercise at a glance — a six-sticker run is six
          thumbnails, and the teacher can point at the row. */}
      {items.length > 1 && items.some((it) => it.replies.some((r) => r.imageUrl)) && (
        <div className="pg-center flex shrink-0 justify-center gap-1.5 overflow-x-auto px-2 pt-2 [scrollbar-width:none]">
          {items.map((it, i) => {
            const thumb = it.replies.find((r) => r.imageUrl)?.imageUrl;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`${i + 1}. üretim`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "grid size-11 shrink-0 place-items-center overflow-hidden rounded-[9px] border transition-[border-color,transform] duration-[.16s]",
                  i === index ? "border-[color:var(--pn-navy)] ring-2 ring-[color:var(--pn-blue)]" : "border-[color:var(--pn-hair-strong)] hover:-translate-y-px",
                )}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="size-full object-cover" />
                ) : (
                  <span className="font-mono text-[10px] font-semibold text-on-surface-variant">{i + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* The prompt that made this, and the actions on it — a floating bar on
          the page ground, not a footer inside a card. */}
      <div className="pg-center flex shrink-0 flex-col items-center gap-2 px-2 pt-2.5">
        {/* Model · pixel size · position in the thread. These used to be three
            chips pinned to the corners of the stage; with no card behind them
            they floated in open blue, metres away from the picture they
            described. One line under the work says the same thing. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10px] font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 text-on-surface" title={primaryTool.description}>
            <ToolAvatar tool={primaryTool} className="size-4 !p-0.5" iconClassName="size-2.5" />
            {primaryTool.name}
          </span>
          {size && (
            <>
              <span aria-hidden>·</span>
              <span>{size}</span>
            </>
          )}
          {items.length > 1 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {index + 1} / {items.length}
              </span>
            </>
          )}
        </div>
        {/* What made this one. Only shown when a dial was actually moved, so
            the line stays quiet on a default generation — and clicking it
            puts those settings back in the studio, which is how "change one
            thing and look again" becomes a single tap. */}
        {primary?.params && Object.keys(primary.params).length > 0 && (
          <button
            type="button"
            onClick={() => actions.onRestoreParams(primary)}
            disabled={actions.disabled}
            title="Bu ayarları stüdyoya geri yükle"
            className="pg-chip pg-chip--tag !h-7 max-w-full"
          >
            <SlidersHorizontal className="size-3 shrink-0 opacity-70" strokeWidth={1.9} aria-hidden />
            <span className="truncate">{describeParams(primaryTool, actions.role, primary.params)}</span>
          </button>
        )}
        {/* The prompt line stays off a phone: it is the same text sitting in
            the composer's history and costs two lines the action bar needs. */}
        <p className="hidden max-w-2xl text-center text-[12px] leading-snug text-on-surface-variant sm:line-clamp-2" title={item.prompt.content}>
          <Pencil className="mr-1 inline size-3 align-[-2px] text-outline" aria-hidden />
          {item.prompt.content}
        </p>
        <div className="pg-actionbar">
          <ActionButton icon={RefreshCw} label="Yeniden oluştur" title="Aynı tarifi seçili modelle bir kez daha üret" disabled={actions.disabled} onClick={() => actions.onRegenerate(item)} />
          {tool.modality === "image" && (
            <ActionButton
              icon={Shuffle}
              label="Varyasyon"
              title={actions.canReference ? "Bu görseli referans alıp aynı tarifle bir varyasyon üret" : "Seçili model referans görsel almıyor"}
              disabled={actions.disabled || !actions.canReference || !primary?.imageUrl}
              onClick={() => primary && actions.onVariation(item, primary)}
            />
          )}
          <ActionButton
            icon={Columns2}
            label="Karşılaştır"
            title={actions.compareAvailable ? "Aynı isteği iki modele birden gönder" : "Karşılaştırma videoda kapalı"}
            pressed={actions.compareOn}
            disabled={actions.disabled || !actions.compareAvailable}
            onClick={actions.onCompare}
          />
          {tool.modality === "image" && (
            <ActionButton
              icon={Pencil}
              label="Düzenle"
              title={actions.canReference ? "Tarifi ve görseli composer'a al, değiştirip yeniden üret" : "Seçili model referans görsel almıyor"}
              disabled={actions.disabled || !actions.canReference || !primary?.imageUrl}
              onClick={() => primary && actions.onEdit(item, primary)}
            />
          )}
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-[color:var(--pn-hair-strong)]" />
          <ActionButton icon={Download} label="İndir" title="Cihazına kaydet" disabled={!hasMedia} onClick={() => primary && actions.onDownload(primary)} />
        </div>
      </div>
    </>
  );
}

/**
 * "Çözünürlük 2K · Tohum 4213" — a past result's settings in the same words
 * the studio uses for them.
 *
 * Labels come from the field schema rather than from a second table of
 * strings, so a dial renamed in one place is renamed here too; a key the
 * schema no longer knows (an old generation, a model whose catalog entry
 * changed) is skipped rather than printed raw.
 */
function describeParams(tool: PlaygroundTool, role: Role, params: StudioParams): string {
  const fields = studioFields(tool, role);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const field = fields.find((f) => f.key === key);
    if (!field || value === null || value === undefined) continue;
    if (typeof value === "boolean") {
      parts.push(value ? field.label : `${field.label} kapalı`);
    } else if (field.spec.control === "choice") {
      parts.push(`${field.label} ${field.spec.options.find((o) => o.value === String(value))?.label ?? value}`);
    } else {
      parts.push(`${field.label} ${value}`);
    }
  }
  return parts.join(" · ");
}

function ActionButton({
  icon: Icon,
  label,
  title,
  pressed,
  disabled,
  onClick,
}: {
  icon: typeof RefreshCw;
  label: string;
  title: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="pg-action" title={title} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** One output, as large as the stage allows. */
function Media({
  reply,
  tool,
  pending,
  onView,
  compact,
  onSize,
}: {
  reply: Msg | undefined;
  tool: PlaygroundTool;
  pending: boolean;
  onView: (item: ViewerItem) => void;
  compact?: boolean;
  /** Reports the picture's real pixel size up to the caption row. */
  onSize?: (size: string | null) => void;
}) {
  const { size, onLoad } = useNaturalSize(reply?.imageUrl);
  useEffect(() => {
    onSize?.(size);
  }, [size, onSize]);

  if (!reply) return null;

  if (pending && !reply.imageUrl && !reply.videoUrl && !reply.audioUrl) {
    const what = tool.modality === "video" ? "Video hazırlanıyor — birkaç dakika sürebilir" : tool.modality === "audio" ? "Ses üretiliyor…" : "çiziyor…";
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue-sel)]",
          compact ? "h-full w-full" : "aspect-square max-h-full w-full max-w-[min(100%,520px)]",
        )}
        aria-live="polite"
      >
        <ToolAvatar tool={tool} className="size-10" iconClassName="size-5" />
        <TypingDots />
        <p className="text-[13px] font-semibold text-on-surface-variant">
          {tool.modality === "image" ? (
            <>
              <span className="text-on-surface">{tool.name}</span> {what}
            </>
          ) : (
            what
          )}
        </p>
      </div>
    );
  }

  if (reply.imageUrl) {
    return (
      // The button is `absolute inset-0`, which is what gives the <img> a
      // definite box to measure `max-h-full` against — inside a plain flex
      // parent it would resolve against `auto` and the picture would render
      // at its intrinsic size.
      <div className="relative h-full min-h-0 w-full">
        <button
          type="button"
          onClick={() => onView({ kind: "image", url: reply.imageUrl!, title: tool.name })}
          aria-label="Görseli tam ekran aç"
          className="absolute inset-0 flex cursor-zoom-in items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed one-hour URL; next/image has no session */}
          <img
            src={reply.imageUrl}
            alt=""
            onLoad={onLoad}
            className="max-h-full max-w-full rounded-[14px] object-contain shadow-[var(--pn-shadow-float)] duration-300 animate-in fade-in-0 zoom-in-95"
          />
        </button>
        {!compact && (
          <button
            type="button"
            onClick={() => onView({ kind: "image", url: reply.imageUrl!, title: tool.name })}
            aria-label="Tam ekran"
            title="Tam ekran"
            className="pg-stage-btn absolute right-0 top-0"
          >
            <Expand className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  if (reply.videoUrl) {
    return (
      <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
        <video src={reply.videoUrl} controls className="max-h-full max-w-full rounded-[14px] shadow-[var(--pn-shadow-float)]" />
        {!compact && (
          <button
            type="button"
            onClick={() => onView({ kind: "video", url: reply.videoUrl!, title: tool.name })}
            aria-label="Tam ekran"
            title="Tam ekran"
            className="pg-stage-btn absolute right-0 top-0"
          >
            <Expand className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  if (reply.audioUrl) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <span className="grid size-20 place-items-center rounded-full bg-[color:var(--pn-violet)] text-[color:var(--pn-violet-ink-strong)] shadow-[var(--pn-shadow-float)]">
          <Music2 className="size-9" strokeWidth={1.6} aria-hidden />
        </span>
        <audio src={reply.audioUrl} controls className="w-full" />
      </div>
    );
  }

  if (reply.kind === "code" && reply.content) {
    return (
      <div className="h-full w-full overflow-auto">
        <CodeOutputView html={reply.content} toolName={tool.name} onView={onView} />
      </div>
    );
  }

  // A text answer where a picture was expected: usually the error line the
  // route writes when a generation fails. Shown plainly, not hidden.
  return (
    <div className="max-w-md rounded-[14px] border border-[color:var(--pn-hair)] bg-surface-container px-4 py-3 text-center text-[14px] leading-relaxed text-on-surface">
      {reply.content || (pending ? <TypingDots /> : "—")}
    </div>
  );
}
