"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { GraduationCap, Paperclip, SendHorizontal, SlidersHorizontal, Square, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ASPECT_RATIOS } from "@/lib/playground/aspect";
import { useGlowDrift } from "@/lib/playground/use-glow-drift";
import { acceptFor, ATTACHMENT_LIMITS, classifyFile, dataUrlBytes, formatSize, KIND_LABEL, kindList, type Attachment, type AttachmentKind } from "@/lib/playground/attachments";
import { AttachmentChip } from "./attachment-chip";
import type { RunState } from "./types";

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
export async function toAttachmentDataUrl(file: File): Promise<string | null> {
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

/** Office files can be large for the text they hold (embedded pictures); past this we don't even unpack. */
const MAX_OFFICE_BYTES = 25 * 1024 * 1024;

type FileResult = { attachment: Attachment } | { error: string };

/** A file as a data URL carrying OUR mime, not the browser's — the server whitelists the canonical one. */
function readDataUrl(file: File, mime: string): Promise<string> {
  const blob = new Blob([file], { type: mime });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * One picked/pasted/dropped file → an attachment, or one sentence saying why
 * not. The sentence is for the student, so it names the file, says what
 * would have worked, and never mentions a MIME type.
 *
 * Pictures take the downscale path above. PDFs, sound and video are read as
 * they are (the server re-checks size and magic). Text files are read as
 * text; Word, Excel and PowerPoint are unpacked to text right here in the
 * browser (`office-text.ts`, loaded on first use) — the model gets words,
 * not a binary it may not know how to open.
 */
export async function fileToAttachment(file: File, kinds: readonly AttachmentKind[]): Promise<FileResult> {
  const name = file.name || "dosya";
  const cls = classifyFile(file.name, file.type);
  if (!cls) return { error: `"${name}" desteklenmiyor — ${kindList(kinds)} ekleyebilirsin.` };
  if (!kinds.includes(cls.kind)) return { error: `Bu model ${KIND_LABEL[cls.kind]} okuyamıyor — ${kindList(kinds)} ekleyebilirsin.` };
  const limit = ATTACHMENT_LIMITS[cls.kind];
  const tooBig = `"${name}" çok büyük — ${KIND_LABEL[cls.kind]} en fazla ${formatSize({ kind: cls.kind, size: limit })} olabilir.`;

  if (cls.kind === "image") {
    const data = await toAttachmentDataUrl(file);
    if (!data) return { error: `"${name}" açılamadı — PNG, JPG ya da WebP dener misin?` };
    return { attachment: { kind: "image", name: file.name, mime: "image/jpeg", data, size: dataUrlBytes(data) } };
  }

  if (cls.kind === "text") {
    if (file.size > (cls.office ? MAX_OFFICE_BYTES : limit * 2)) return { error: tooBig };
    let text: string;
    try {
      text = cls.office ? await (await import("@/lib/playground/office-text")).officeText(await file.arrayBuffer(), cls.office) : await file.text();
    } catch {
      return { error: `"${name}" açılamadı — dosya bozuk olabilir.` };
    }
    // A NUL byte is the cheapest tell that a "text" file is really a binary.
    if (!cls.office && text.includes("\u0000")) return { error: `"${name}" okunabilir bir metin değil.` };
    text = text.replace(/\r\n?/g, "\n").trim();
    if (!text) return { error: `"${name}" boş görünüyor.` };
    if (text.length > limit) return { error: tooBig };
    return { attachment: { kind: "text", name: file.name, mime: "text/plain", data: text, size: text.length } };
  }

  if (file.size > limit) return { error: tooBig };
  const data = await readDataUrl(file, cls.mime);
  return { attachment: { kind: cls.kind, name: file.name, mime: cls.mime, data, size: file.size } };
}

export type AspectOption = (typeof ASPECT_RATIOS)[number];

export interface MemoryControl {
  on: boolean;
  /** What memory means for the selected tool. */
  kind: "text" | "image";
  /** Memory is on AND there is actually a picture in this thread to carry. */
  carrying: boolean;
  onToggle: () => void;
}

export function memoryHelp(m: MemoryControl): string {
  return m.on
    ? m.kind === "text"
      ? "Hafıza açık — model bu sohbette yazılanları okuyor. Kapatırsan her mesaj sıfırdan başlar."
      : m.carrying
        ? "Hafıza açık — bu sohbette ürettiğin son görselden devam edecek. Aynı karakteri koruyup sadece ifadeyi değiştirmek için bunu açık bırak."
        : "Hafıza açık — ilk görseli ürettiğinde, sonrakiler ondan devam edecek."
    : m.kind === "text"
      ? "Hafıza kapalı — model önceki mesajları görmüyor, her seferinde sıfırdan başlıyor."
      : "Hafıza kapalı — her görsel boş sayfadan başlıyor, öncekine benzemeyecek.";
}

function formatOre(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/**
 * The composer: the prompt, and send.
 *
 * Two rows and nothing else. Everything that answers "what am I talking to and
 * with which dials" moved out — the model to the bar, the shape and the memory
 * switch to the tools panel — because those are set once and then read, while
 * this box is typed in all day. What stays is what changes with every press:
 * the sentence, what it will cost, the picture you attached, and the button.
 */
export function Composer({
  input,
  setInput,
  textareaRef,
  onSend,
  onStop,
  canStop,
  busy,
  gated,
  gatedHint,
  attachments,
  setAttachments,
  maxAttachments,
  kinds,
  onReject,
  firstFrameMode,
  run,
  onCancelRun,
  toolsOpen,
  onToggleTools,
  studioCount,
  compareOn,
  pendingCost,
  placeholder,
  quick,
}: {
  input: string;
  setInput: (v: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (text: string) => void;
  onStop: () => void;
  canStop: boolean;
  busy: boolean;
  /** The send is refused: out of cevher, or dials past the per-generation cap. */
  gated: boolean;
  /** Why, in one sentence — the two reasons need different answers from a student. */
  gatedHint: string | null;
  attachments: Attachment[];
  setAttachments: (updater: (prev: Attachment[]) => Attachment[]) => void;
  /** How many files may ride along with one message; 0 hides the button. */
  maxAttachments: number;
  /** Which kinds this model takes — decides the picker's filter and the wording. */
  kinds: readonly AttachmentKind[];
  /** A file was turned away; one sentence saying why, for the toast. */
  onReject: (text: string) => void;
  /** Video tools: the attached picture is the clip's first frame, not context. */
  firstFrameMode: boolean;
  /** A lesson run in flight — takes the composer over while it walks. */
  run: RunState | null;
  onCancelRun: () => void;
  toolsOpen: boolean;
  onToggleTools: () => void;
  /** How many studio dials sit off their default — the badge on the button. */
  studioCount: number;
  compareOn: boolean;
  pendingCost: number;
  placeholder: string;
  /** The quick-action row, rendered just above the composer. */
  quick: ReactNode;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  useGlowDrift(glowRef);
  const [dragging, setDragging] = useState(false);
  const canAttach = maxAttachments > 0 && kinds.length > 0;
  const full = attachments.length >= maxAttachments;
  const locked = busy || !!run;
  // Image and video tools take pictures and nothing else, and their button
  // says "görsel"; a text model's says "dosya" and lists what it reads.
  const imageOnly = kinds.length === 1 && kinds[0] === "image";
  const noun = imageOnly ? "görsel" : "dosya";

  // Grow the box with the text instead of scrolling a one-line slot. Height
  // has to go back to `auto` first, otherwise scrollHeight can only ever
  // report the current (already grown) height and the box never shrinks
  // again after a delete or a send.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [input, attachments.length, textareaRef]);

  /**
   * Shared by the file picker, paste and drop — all three end up here. Good
   * files are staged; the first bad one is explained in the toast, and so is
   * a drop of more files than there is room for.
   */
  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const room = maxAttachments - attachments.length;
    const overflow = `En fazla ${maxAttachments} ${noun} ekleyebilirsin.`;
    if (room <= 0) {
      onReject(overflow);
      return;
    }
    const results = await Promise.all(list.slice(0, room).map((f) => fileToAttachment(f, kinds)));
    const usable = results.flatMap((r) => ("attachment" in r ? [r.attachment] : []));
    if (usable.length > 0) setAttachments((prev) => [...prev, ...usable].slice(0, maxAttachments));
    const problem = results.find((r): r is { error: string } => "error" in r)?.error ?? (list.length > room ? overflow : null);
    if (problem) onReject(problem);
  }

  // What this press will cost, and nothing else. The old line also explained
  // Enter/Shift+Enter on every screen forever — a keyboard hint a student
  // reads once and then has to look past for the rest of the year.
  const costHint = compareOn
    ? pendingCost > 0
      ? `2 üretim · ${formatOre(pendingCost)} cevher`
      : "2 üretim · ücretsiz"
    : pendingCost > 0
      ? `${formatOre(pendingCost)} cevher`
      : null;

  return (
    <div className="pg-dock">
      {/* A run owns the composer while it walks: the student can watch where
          it is and stop it, but not queue a second one on top. */}
      {run ? (
        <div className="pg-center flex items-center gap-3 rounded-[14px] border border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint-tint)] px-3 py-2 duration-200 animate-in fade-in-0 slide-in-from-bottom-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[color:var(--pn-mint)] text-[color:var(--pn-mint-ink-strong)]">
            <GraduationCap className="size-4" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold leading-snug text-on-surface">
              {run.label} — {Math.min(run.done + 1, run.total)}/{run.total}
            </span>
            <span className="block truncate font-mono text-[10px] text-on-surface-variant">{run.step}</span>
          </span>
          {/* Progress as segments, not a bar: the count is what a student is
              actually tracking, and each segment is one generation they paid for. */}
          <span aria-hidden className="hidden shrink-0 gap-1 sm:flex">
            {Array.from({ length: run.total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-4 rounded-full",
                  i < run.done ? "bg-[color:var(--pn-mint-ink)]" : i === run.done ? "animate-pulse bg-[color:var(--pn-peach-ink)]" : "bg-[color:var(--pn-hair-strong)]",
                )}
              />
            ))}
          </span>
          <button type="button" onClick={onCancelRun} className="pn-btn pn-btn--sm pn-btn--paper">
            Turu bitir
          </button>
        </div>
      ) : (
        quick
      )}

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
        onClick={(e) => {
          // The whole box is the prompt. The textarea itself is only two
          // lines tall; the padding around it, the empty run of the button
          // row and the attachment strip are all "the text box" to a
          // student, so a click anywhere that isn't a control lands the
          // caret at the end of what's typed. Controls keep their own
          // clicks, and a drag that selected text is left alone.
          const target = e.target as HTMLElement;
          if (target.closest("button, a, input, textarea, select, label, [role='button']")) return;
          if (window.getSelection()?.toString()) return;
          const el = textareaRef.current;
          if (!el || el.disabled) return;
          el.focus();
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }}
        data-dragging={dragging || undefined}
        className={cn(
          "pg-composer pg-center cursor-text rounded-[16px] border border-[color:var(--pn-hair-strong)] bg-surface-container shadow-[var(--pn-shadow-float)] transition-[background-color,border-color] duration-[.16s]",
          dragging && "border-[color:var(--pn-blue-ink)] bg-[color:var(--pn-blue-sel)]",
        )}
      >
        {/* The light under the words — `.pg-glow` in globals.css. Decorative,
            paints beneath everything in the box, and only exists in the ice
            theme (the dark theme hides it outright). Four blobs: CSS breathes
            them, `useGlowDrift` hands each a new random target every few
            seconds so the pattern never repeats. */}
        <span ref={glowRef} className="pg-glow" aria-hidden>
          <span className="pg-blob" />
          <span className="pg-blob" />
          <span className="pg-blob" />
          <span className="pg-blob" />
        </span>
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            {attachments.map((a, i) => {
              // A file is a chip: its name, what it is, how big. A picture is
              // the picture.
              if (a.kind !== "image") {
                return (
                  <div key={i} className="animate-in fade-in-0 zoom-in-95">
                    <AttachmentChip attachment={a} onRemove={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
                  </div>
                );
              }
              // On a video model each slot has a job, and which job it is
              // depends on position: the first picture opens the clip, the
              // second (only when the end-frame dial is on) closes it.
              const frame = firstFrameMode ? (i === 0 ? "İlk kare" : "Son kare") : null;
              return (
                <div key={i} className="group/thumb relative animate-in fade-in-0 zoom-in-95">
                  {/* eslint-disable-next-line @next/next/no-img-element -- client-side data URL, never a remote asset */}
                  <img src={a.data} alt="" className="size-16 rounded-[10px] border border-[color:var(--pn-hair-strong)] object-cover" />
                  {frame && (
                    <span className="absolute inset-x-0 bottom-0 rounded-b-[10px] bg-[color:var(--pn-navy)]/85 py-0.5 text-center text-[9px] font-semibold text-[color:var(--pn-on-navy)]">
                      {frame}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={frame ? `${frame}yi kaldır` : "Görseli kaldır"}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-[color:var(--pn-hair-strong)] bg-surface-container text-on-surface-variant transition-colors hover:bg-[color:var(--pn-pink)] hover:text-[color:var(--pn-pink-ink-strong)]"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
            {firstFrameMode && (
              <p className="text-[11px] text-on-surface-variant">
                {maxAttachments > 1 ? "Video ilk kareden başlar, son karede biter." : "Video bu kareden başlar."}
              </p>
            )}
          </div>
        )}

        {/* The prompt. */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => {
            if (!canAttach) return;
            const files = Array.from(e.clipboardData.files);
            if (files.length === 0) return;
            // Only swallow the paste when it really carried a file —
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
          rows={2}
          placeholder={placeholder}
          disabled={!!run}
          className="pg-prompt pn-bare mt-1 max-h-44 min-h-[3.25rem]"
        />

        {/* The one row under the prompt: what it costs, and the three
            buttons that act on what was typed. */}
        <div className="flex min-w-0 items-center justify-end gap-2 px-3 pb-3">
          {/* Kept next to the buttons rather than pushed to the far left: the
              left edge of the composer is where Nova's bubble sits, and the
              price is about the press anyway. */}
          {costHint && <span className="mr-1 font-mono text-[10px] font-semibold text-[color:var(--pn-peach-ink)]">{costHint}</span>}
          {/* The dials live behind this one button. The count is the memory
              aid: a student who set four of them three prompts ago should not
              have to open the panel to remember that. */}
          <button
            type="button"
            onClick={onToggleTools}
            aria-pressed={toolsOpen}
            aria-label={studioCount > 0 ? `Gelişmiş ayarlar — ${studioCount} ayar değiştirildi` : "Gelişmiş ayarlar"}
            title={studioCount > 0 ? `Gelişmiş ayarlar — ${studioCount} ayar değiştirildi` : "Gelişmiş ayarlar"}
            className="pn-btn pn-btn--icon pn-btn--paper relative"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.9} aria-hidden />
            {studioCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[color:var(--pn-peach)] font-mono text-[9px] font-bold text-[color:var(--pn-peach-ink)]">
                {studioCount}
              </span>
            )}
          </button>
          {canAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptFor(kinds)}
                multiple={maxAttachments > 1}
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
                disabled={full || locked}
                aria-label={firstFrameMode ? (attachments.length === 0 ? "İlk kareyi seç" : "Son kareyi seç") : imageOnly ? "Görsel ekle" : "Dosya ekle"}
                title={
                  firstFrameMode
                    ? attachments.length === 0
                      ? "İlk kareyi seç — video bu görselden başlar"
                      : "Son kareyi seç — video burada biter"
                    : full
                      ? `En fazla ${maxAttachments} ${noun}`
                      : imageOnly
                        ? "Görsel ekle"
                        : `Dosya ekle — ${kindList(kinds)}`
                }
                className="pn-btn pn-btn--icon pn-btn--paper"
              >
                <Paperclip className="size-4" strokeWidth={1.9} aria-hidden />
              </button>
            </>
          )}
          {busy && canStop ? (
            <button type="button" onClick={onStop} aria-label="Durdur" title="Durdur" className="pn-btn pn-btn--icon pn-btn--pink">
              <Square className="size-3.5 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || locked || gated}
              aria-label="Gönder"
              title={gatedHint ?? "Gönder"}
              className="pn-btn pn-btn--icon pn-btn--mint"
            >
              <SendHorizontal className="size-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
