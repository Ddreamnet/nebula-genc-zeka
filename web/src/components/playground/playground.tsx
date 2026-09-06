"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Square,
  Brain,
  GraduationCap,
  Smile,
  Eraser,
  Expand,
  Columns2,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/cn";
import { whatsappHref } from "@/lib/site";
import { WhatsappIcon } from "@/components/ui/brand-icons";
import { CATEGORIES, FEATURED_TOOL, findTool, generationOreCost, type PlaygroundTool, type ToolModality } from "@/lib/playground/tools";
import { CURRICULUM_MONTHS, weeksInMonth, resolveWeekTools } from "@/lib/playground/curriculum";
import { buildRows } from "@/lib/playground/transcript";
import { readEventStream } from "@/lib/playground/event-stream";
import { cutOutBackground } from "@/lib/playground/cutout";
import { MediaViewer, type ViewerItem } from "./media-viewer";
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, type AspectRatio } from "@/lib/playground/aspect";
import { buildExpressionRun, LESSON_EXPRESSIONS, type LessonStep } from "@/lib/playground/lesson-runs";
import { LessonTools } from "./lesson-tools";
import { ProviderBadge } from "./provider-logos";
import { ChatHistory } from "./chat-history";
import { Markdown } from "./markdown";
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

/**
 * Re-encodes an already-generated picture (a signed storage URL) as an
 * attachment data URL.
 *
 * The sticker run needs the SAME base avatar pinned to all six expressions.
 * Letting each step reference the previous one would have been free — the
 * memory switch already does that — but six chained edits drift, and a pack
 * that drifts is exactly what the lesson slide warns against ("paket bir
 * aileye benzesin"). Sending the base image explicitly on every step costs the
 * same and holds the character still.
 *
 * Goes through the same downscale/encode path as a picked file, so what
 * reaches the server is indistinguishable from a normal attachment and rides
 * the already-verified `input_references` route.
 */
async function imageUrlToAttachment(url: string): Promise<string | null> {
  const blob = await fetch(url)
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
  if (!blob || !blob.type.startsWith("image/")) return null;
  return toAttachmentDataUrl(new File([blob], "referans", { type: blob.type }));
}

type Msg = {
  /**
   * Stable client-side handle for this message.
   *
   * Everything used to be patched by position — "the last assistant turn" —
   * which only works while exactly one generation is ever in flight. A
   * comparison runs two at once, and whichever finishes first would otherwise
   * write its answer into the other one's bubble. Ids are assigned when the
   * placeholder is pushed and never reused; messages restored from a stored
   * transcript have none, because nothing is ever written into them.
   */
  id?: string;
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
   * The model's own thinking, streamed on a separate channel by the models
   * flagged `reasoning` in the catalog. Session-only: the transcript tables
   * store the answer, not the reasoning, so reopening a chat shows the reply
   * without it. That is deliberate — the thinking is a live teaching aid, not
   * a record, and storing it would mean touching the chat history schema.
   */
  reasoning?: string;
  /**
   * Which tool produced this turn. Needed because the conversation now
   * survives model changes: rendering every bubble with the *current* model's
   * avatar would retroactively re-attribute old answers to whichever model
   * happens to be selected now.
   */
  toolId?: string;
  /**
   * Which half of a comparison this reply is. Absent on an ordinary turn.
   *
   * The two halves are always pushed together and adjacent, so the transcript
   * renders a pair by looking at one message and its neighbour rather than
   * carrying a group id around.
   */
  compare?: "a" | "b";
};

type GateReason = "insufficient_balance" | "login_required" | null;

/** How one generation ended. Only "ok" lets a lesson run continue. */
type SendOutcome = "ok" | "gated" | "error" | "aborted";

/** A lesson run in flight — which task, and how far through it we are. */
type RunState = { label: string; done: number; total: number; step: string };

/**
 * Transient toast above the composer. `soon` explains a locked tool; `busy`
 * explains the concurrency cap — which is a "wait a moment", not a wall, so it
 * must never reach the gated callout with its balance upsell.
 */
type Notice =
  | { kind: "soon"; tool: string }
  | { kind: "busy" }
  /** A lesson run needed a picture from this thread and couldn't read it back. */
  | { kind: "reference" };

const NOTICE_MS: Record<Notice["kind"], number> = { soon: 2400, busy: 3400, reference: 3600 };

// "Tümü" menu shows everything in one place; the featured tool lives only here, not under any single category.
const ALL_TOOLS_FLAT: PlaygroundTool[] = [FEATURED_TOOL, ...CATEGORIES.flatMap((c) => c.tools)];

const LESSON_EXPRESSION_COUNT = LESSON_EXPRESSIONS.length;

/** Handle for one message in this session. Never persisted, never reused. */
let msgSeq = 0;
function newMsgId(): string {
  msgSeq += 1;
  return `m${msgSeq}`;
}

/**
 * Comparison is off for video and only for video.
 *
 * Not a taste call: a comparison is two generations, and video is the one
 * modality where that is expensive enough to matter — 5 to 30 cevher a clip,
 * so 10 to 60 for the pair, against 0 for text and 1-3 for a picture. It also
 * eats two of the three concurrent generations a student is allowed at once
 * (rpc_start_generation), for two clips that each take minutes to land.
 */
function canCompareWith(tool: PlaygroundTool): boolean {
  return tool.modality !== "video";
}

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
  /**
   * The second model in a comparison, or null when comparison is off.
   *
   * `activeTool` is always the left-hand side, so this is the only extra piece
   * of state the mode needs — "comparing" is just "there is a right-hand
   * model". Cleared whenever the left side moves to a modality that can't be
   * compared, so the two can never disagree about what is on screen.
   */
  const [compareTool, setCompareTool] = useState<PlaygroundTool | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  /**
   * The replies still being generated, by message id.
   *
   * A plain `busy` boolean was enough while one generation ran at a time. A
   * comparison runs two, and they finish at different moments: the array is
   * what lets the finished half stop showing its typing dots while the other
   * half keeps them, and `busy` (the composer's own lock) is simply "is
   * anything still running".
   */
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const busy = pendingIds.length > 0;
  const [remaining, setRemaining] = useState(20);
  /**
   * This account has no cevher allowance at all — a teacher (see
   * api/playground/balance). Not "a very large balance": there is no number to
   * count down, so the meter shows ∞ and the balance gate is skipped entirely
   * rather than compared against a placeholder.
   *
   * Admins are NOT unlimited here even though they also spend no wallet: their
   * balance is the real OpenRouter treasury and it can genuinely run out, so
   * they keep a number and keep being gated on it.
   */
  const [unlimited, setUnlimited] = useState(false);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  /** Server-side thread this transcript belongs to; null until the first turn. */
  const [chatId, setChatId] = useState<string | null>(null);
  /**
   * The same value, readable synchronously.
   *
   * A lesson run (see `runLesson`) fires several generations from inside one
   * event handler, and the first of them is what opens the thread. Reading
   * `chatId` from the closure there would still see `null` on every later step
   * — each one would open its own chat and the six stickers would land in six
   * different transcripts. Every write goes through `applyChatId` so the two
   * can't drift.
   */
  const chatIdRef = useRef<string | null>(null);
  /**
   * Whether this thread carries anything forward into the next generation.
   *
   * One switch, two meanings, because "hafıza" means the same thing to a
   * student either way:
   *  - text: the running transcript is resent, so the model remembers what
   *    was said. Off, every message starts from nothing.
   *  - image/video: the last picture this chat produced rides along as a
   *    reference, so "same character, new expression" actually works. Off,
   *    every generation starts from a blank canvas — which is what it always
   *    did, and why a sticker pack came back as twelve unrelated characters.
   *
   * Default on: that is what a student expects from anything that calls
   * itself a chat, and it is what week 1's sticker-pack task needs.
   */
  const [memory, setMemory] = useState(true);
  /**
   * Output shape. Week 7 asks for "a usable poster / logo / cover" and those
   * are three different shapes; everything used to come out 9:16 because the
   * ratio was a single constant in openrouter.ts.
   */
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  /** A lesson run in flight, or null. Blocks the composer while it walks. */
  const [run, setRun] = useState<RunState | null>(null);
  /** The one thing currently open full-screen, or null. */
  const [viewing, setViewing] = useState<ViewerItem | null>(null);
  /** Set by the run's stop button; checked between steps. */
  const runCancelRef = useRef(false);
  /** Bumped whenever the history list could have changed, to re-fetch it. */
  const [historyKey, setHistoryKey] = useState(0);
  const [loadingChat, setLoadingChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * In-flight generations, so the stop button can cancel them.
   *
   * A set rather than a single controller: a comparison has two requests open
   * at once and "durdur" has to mean both, not whichever one registered last.
   */
  const abortsRef = useRef<Set<AbortController>>(new Set());
  /**
   * Whether the transcript is at (or near) its end. A streamed answer grows
   * the scroll height dozens of times a second; without this, a student who
   * scrolled up to reread something would be yanked back down by every chunk.
   */
  const pinnedRef = useRef(true);

  function applyChatId(id: string | null) {
    chatIdRef.current = id;
    setChatId(id);
  }


  // 0 means this model can't see images at all, which is what hides the
  // attach button. The server enforces the same ceiling regardless.
  const maxImages = activeTool.maxImageInputs ?? 0;
  /**
   * Which sentence the memory switch tells the truth with for this tool, and
   * whether it applies at all. Audio has nothing to carry, and so does a video
   * model that takes no frame image (Sora 2 Pro) — the switch hides for both
   * rather than sitting there doing nothing.
   */
  const memoryKind: "text" | "image" | null =
    activeTool.modality === "text" ? "text" : maxImages > 0 ? "image" : null;
  // Mirrors the server's carry-forward rule (generate/route.ts): the most
  // recent user turn's images are resent with the next message and billed
  // again. Counting them here is what keeps the quoted price honest.
  const carriedCount =
    memory && !compareTool && activeTool.modality === "text"
      ? Math.min(
          [...messages].reverse().find((m) => m.role === "user" && m.content.trim())?.attachments?.length ?? 0,
          Math.max(0, maxImages - attachments.length),
        )
      : 0;
  // The picture memory would carry into an image/video generation: the most
  // recent one this thread produced. One, not all of them — the point is to
  // continue from the last frame, and every extra reference is billed.
  //
  // The three conditions after `memory` mirror the server exactly (see
  // `remembered` in generate/route.ts), because this number is what the
  // composer quotes and what the balance gate blocks on: a stored picture
  // only exists once the thread does (`chatId`), and a picture the student
  // attached themselves wins outright rather than sharing the budget.
  const memoryImages =
    memory &&
    // A comparison forces memory off for the send (see sendOne), so it must
    // not be priced with a carried reference either — the quote has to be the
    // number the server will actually charge.
    !compareTool &&
    memoryKind === "image" &&
    chatId !== null &&
    attachments.length === 0 &&
    messages.some((m) => m.role === "assistant" && !!m.imageUrl)
      ? 1
      : 0;
  // Attached images cost extra, so the balance gate has to price the message
  // as composed right now — not the tool's bare per-message rate. A comparison
  // is two whole generations and is priced as exactly that: the gate has to
  // refuse a send the student can only half afford, rather than letting the
  // first model answer and the second come back empty.
  const pendingCost =
    generationOreCost(activeTool, attachments.length + carriedCount + memoryImages) +
    (compareTool ? generationOreCost(compareTool, attachments.length) : 0);
  const gated = gateReason !== null || (!unlimited && remaining < pendingCost);

  /** The transcript, folded so a comparison's two replies draw as one row. */
  const renderRows = useMemo(() => buildRows(messages), [messages]);

  const refreshBalance = useCallback(() => {
    fetch("/api/playground/balance")
      .then((r) => {
        if (!r.ok) {
          // Session expired mid-visit — the Playground needs a signed-in account.
          window.location.href = "/giris";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setUnlimited(data.unlimited === true);
        setRemaining(data.balance);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Remembered across reloads, like the history panel's open state. A student
  // who deliberately turned memory off for a run of unrelated images should
  // not find it back on after a refresh.
  useEffect(() => {
    setMemory(window.localStorage.getItem("pg-memory") !== "0");
  }, []);
  const memoryFirstRun = useRef(true);
  useEffect(() => {
    if (memoryFirstRun.current) {
      memoryFirstRun.current = false;
      return;
    }
    window.localStorage.setItem("pg-memory", memory ? "1" : "0");
  }, [memory]);

  /**
   * Finish anything the last visit left hanging.
   *
   * A video renders for minutes; if the student closed the tab while one was
   * running, the poll loop died with it and the row stayed pending — ore gone,
   * file never fetched. This asks the server to settle those on the way in,
   * which is exactly when the student would otherwise notice an empty bubble.
   * Fire and forget: nothing on screen depends on it, and it only refreshes
   * when it actually settled something.
   */
  useEffect(() => {
    fetch("/api/playground/reconcile", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settled > 0) {
          refreshBalance();
          setHistoryKey((k) => k + 1);
        }
      })
      .catch(() => {});
  }, [refreshBalance]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    // `auto` while a stream is running: this fires many times a second, and
    // queued smooth scrolls fight each other into a stutter.
    el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS[notice.kind]);
    return () => clearTimeout(t);
  }, [notice]);

  /**
   * Patches one reply, by id.
   *
   * This used to search backwards for the last assistant turn, which was only
   * ever right because exactly one generation could be in flight. Two things
   * broke that: a student changing model mid-generation appends a switch
   * marker (so the last entry is not the bubble being written), and a
   * comparison has two bubbles filling in at once. An id can't drift on
   * either.
   */
  function patchMsg(id: string, patch: Partial<Msg>) {
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === id);
      if (i === -1) return m;
      const copy = m.slice();
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  }

  /** Marks one reply finished — it stops showing dots, and may unlock the composer. */
  function finishPending(id: string) {
    setPendingIds((ids) => ids.filter((x) => x !== id));
  }

  /**
   * Drains one streamed answer into the transcript.
   *
   * Two things are batched rather than applied per chunk. A fast model emits
   * chunks quicker than the screen can usefully repaint, and every one of them
   * would otherwise cost a React render plus a scroll — so text lands at ~16fps
   * and the final chunk always flushes. And `kind` stays "text" for the whole
   * stream even for the web tool: switching to the preview early would rebuild
   * an iframe around half-written HTML on every single chunk.
   */
  async function consumeTextStream(body: ReadableStream<Uint8Array>, targetId: string, onChatId?: (id: string) => void) {
    let answer = "";
    let thinking = "";
    let kind: Msg["kind"] = "text";
    let lastFlush = 0;

    const flush = (force = false) => {
      const now = performance.now();
      if (!force && now - lastFlush < 60) return;
      lastFlush = now;
      patchMsg(targetId, {
        content: answer,
        reasoning: thinking || undefined,
        kind: force ? kind : "text",
      });
    };

    for await (const { event, data } of readEventStream(body)) {
      if (event === "meta") {
        if (data.kind === "code") kind = "code";
        // The thread id arrives before the first token, so an answer that
        // finishes after the student has moved on still knows where it belongs
        // — and so the other half of a comparison can be fired into the same
        // thread without waiting for this one to finish writing.
        if (typeof data.chatId === "string") {
          if (data.chatId !== chatIdRef.current) applyChatId(data.chatId);
          onChatId?.(data.chatId);
        }
        setHistoryKey((k) => k + 1);
      } else if (event === "reasoning") {
        thinking += String(data.text ?? "");
        flush();
      } else if (event === "delta") {
        answer += String(data.text ?? "");
        flush();
      } else if (event === "done") {
        if (data.unlimited === true) setUnlimited(true);
        else if (typeof data.remaining === "number") setRemaining(data.remaining);
      } else if (event === "error") {
        // Nothing usable arrived; say so in the bubble the student is watching.
        if (!answer) answer = "Bu isteği oluşturamadım, başka bir şey dener misin? 💫";
        // And drop back to a plain bubble: for the web tool `kind` is "code",
        // which would render this apology inside the preview iframe as if the
        // sentence were the website the student asked for.
        kind = "text";
      }
    }

    flush(true);
  }

  /**
   * What the composer calls. Guards on the UI's own state, hands the typed
   * text and staged pictures to `sendOne`, and clears both.
   */
  async function send(text: string) {
    if (busy || gated || run) return;
    const sentImages = attachments;
    setInput("");
    setAttachments([]);
    await sendOne(text, sentImages);
  }

  /**
   * One side of a send: one model, one bubble, start to finish.
   *
   * "One side" rather than "one generation" because a comparison runs two of
   * these against the same prompt. Everything that used to be read from
   * component state — which tool, which bubble to write into — is an argument
   * now, so two of them can be in flight without writing over each other.
   */
  async function runSide({
    tool,
    prompt,
    images,
    history,
    useMemory,
    targetId,
    waitForChat,
    onChatOpened,
    onGated,
  }: {
    tool: PlaygroundTool;
    prompt: string;
    images: string[];
    history: { role: string; content: string; images: string[] }[];
    useMemory: boolean;
    /** The placeholder bubble this side fills in. */
    targetId: string;
    /**
     * Held by the second side of a comparison until the first has been told
     * what the thread id is.
     *
     * Both sides opening a chat at once is the one thing that genuinely breaks:
     * `rpc_append_turn` opens a thread when handed a null chat id, so two
     * parallel first turns would open two threads and the comparison would be
     * split across both. Once a thread exists this is absent and the two sides
     * run properly in parallel — which, for text, is almost always, because
     * the id arrives in the stream's first frame rather than at the end.
     */
    waitForChat?: Promise<void>;
    /** Called by the first side the moment the server names the thread. */
    onChatOpened?: () => void;
    onGated: (reason: string) => void;
  }): Promise<SendOutcome> {
    if (waitForChat) await waitForChat;

    const controller = new AbortController();
    abortsRef.current.add(controller);

    /** Fills in this side's bubble. Bound so the video poller can hold it. */
    const patch = (p: Partial<Msg>) => patchMsg(targetId, p);

    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          prompt,
          history,
          attachments: images,
          chatId: chatIdRef.current,
          memory: useMemory,
          aspectRatio,
        }),
        signal: controller.signal,
      });

      // Text streams; every other modality has nothing to show until it is
      // finished and still answers as one JSON body.
      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        await consumeTextStream(res.body, targetId, () => onChatOpened?.());
        return "ok";
      }

      const data = await res.json();

      if (data.gated) {
        // The bubbles this side put up never got an answer, so they come back
        // down. By id, not by position: the other half of a comparison may
        // already have written into the array behind this one.
        setMessages((m) => m.filter((x) => x.id !== targetId));
        onGated(String(data.reason ?? "insufficient_balance"));
        if (data.reason !== "too_many_pending") setRemaining(data.remaining ?? 0);
        return "gated";
      }

      if (data.error) {
        patch({ content: "Bu isteği oluşturamadım, başka bir şey dener misin? 💫" });
        return "error";
      }

      if (data.unlimited === true) setUnlimited(true);
      else setRemaining(data.remaining);
      // The server opens the chat on the first turn and hands back its id; from
      // here on every turn rides the same thread.
      if (data.chatId && data.chatId !== chatIdRef.current) applyChatId(data.chatId);
      if (data.chatId) onChatOpened?.();
      setHistoryKey((k) => k + 1);

      if (data.modality === "text") {
        patch({ content: data.content, kind: data.kind === "code" ? "code" : "text" });
      } else if (data.modality === "image") {
        patch({ imageUrl: data.imageUrl });
      } else if (data.modality === "audio") {
        patch({ audioUrl: data.audioUrl });
      } else {
        patch({ videoPending: true });
        // Video is never a comparison side (see canCompareWith), so this poll
        // is always the only one running.
        await pollVideoStatus(
          data.generationId,
          patch,
          () => finishPending(targetId),
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
      return "ok";
    } catch (err) {
      // Pressing stop aborts the fetch, which lands here. Whatever was written
      // stays on screen — the server settles the same partial answer into the
      // transcript — and the balance is re-read because the ore was spent.
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stopped before the model wrote anything: say so rather than leaving
        // an empty bubble that reads as a bug. A partial answer is left
        // exactly as it arrived.
        setMessages((m) => {
          const i = m.findIndex((x) => x.id === targetId);
          if (i === -1 || m[i].content) return m;
          const copy = m.slice();
          copy[i] = { ...copy[i], content: "Durdurdun." };
          return copy;
        });
        refreshBalance();
        return "aborted";
      }
      patch({ content: "Bir şeyler ters gitti, tekrar dener misin? 💫" });
      return "error";
    } finally {
      abortsRef.current.delete(controller);
      // The video branch releases its own bubble early (the poll outlives the
      // request); releasing again here is a no-op.
      finishPending(targetId);
    }
  }

  /**
   * One turn, start to finish — one model, or two side by side.
   *
   * Split out of `send` so a lesson run can drive several of these in a row
   * without going through the composer: it takes its prompt and pictures as
   * arguments instead of reading them from the input state, and reports how it
   * ended so the runner knows whether to keep going.
   */
  async function sendOne(
    text: string,
    sentImages: string[],
    /**
     * Overrides the memory switch for this one call.
     *
     * Lesson runs pass false. Left on, the server would carry each step's
     * output into the next as a reference — which is exactly backwards for a
     * ladder ("watch what this one clause changes") and for a style round:
     * every step would come back looking like the step before it, and the
     * comparison the exercise is built on would disappear. Continuity in a
     * lesson run comes from the pinned reference picture, never from memory.
     */
    memoryOverride?: boolean,
    /**
     * Ignores comparison mode for this one call.
     *
     * Lesson runs pass true. A run is already several generations — six, for
     * the sticker task — and silently doubling every one of them because a
     * toggle was left on somewhere else is not a bill anyone agreed to. The
     * run is also its own comparison: its whole shape is one idea generated
     * several ways, in order, down the transcript.
     */
    forceSingle?: boolean,
  ): Promise<SendOutcome> {
    const q = text.trim();
    if (!q) return "error";

    const secondSide = forceSingle ? null : compareTool;
    // A comparison never carries memory, for the same reason a lesson run
    // doesn't: the whole point is that one prompt is the only difference
    // between the two answers. It would also feed a text model a transcript
    // with two assistant turns in a row for every past comparison, which is
    // not a shape any of them expect.
    const sides = secondSide ? [activeTool, secondSide] : [activeTool];
    const useMemory = secondSide ? false : (memoryOverride ?? memory);

    // Session memory — only makes sense for text chat (image/video/audio
    // tools are one-shot generations, not a conversation). Trimmed to the
    // last HISTORY_LIMIT turns so cost doesn't grow unbounded; server
    // re-enforces the same cap, this is just to keep the payload small.
    const priorTurns =
      useMemory && activeTool.modality === "text"
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

    const userId = newMsgId();
    const sideIds = sides.map(() => newMsgId());

    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: q, attachments: sentImages },
      // Stamped with the model answering *now*, so each bubble keeps its own
      // avatar after the student moves on to a different model.
      ...sides.map((tool, i) => ({
        id: sideIds[i],
        role: "assistant" as const,
        content: "",
        toolId: tool.id,
        compare: secondSide ? ((i === 0 ? "a" : "b") as "a" | "b") : undefined,
      })),
    ]);
    setPendingIds((ids) => [...ids, ...sideIds]);

    // Only the first side may open a thread; see `waitForChat` in runSide.
    let releaseChatGate = () => {};
    const chatGate = chatIdRef.current ? undefined : new Promise<void>((r) => (releaseChatGate = r));

    const gatedReasons: string[] = [];
    const outcomes = await Promise.all(
      sides.map((tool, i) =>
        runSide({
          tool,
          prompt: q,
          images: sentImages,
          history,
          useMemory,
          targetId: sideIds[i],
          waitForChat: i === 0 ? undefined : chatGate,
          onChatOpened: i === 0 ? releaseChatGate : undefined,
          onGated: (reason) => gatedReasons.push(reason),
        }).finally(() => {
          // Whatever happened to the first side — an answer, a refusal, a dead
          // socket — the second must not be left waiting on a gate that will
          // never open. It falls back to opening its own thread, which is the
          // right outcome when the first side produced nothing to share one
          // with.
          if (i === 0) releaseChatGate();
        }),
      ),
    );

    if (gatedReasons.length > 0) {
      const capped = gatedReasons.includes("too_many_pending");
      const everySideRefused = gatedReasons.length === sides.length;
      // Hitting the concurrency cap costs nothing and clears on its own, so
      // the student gets their text and attachments back to send again rather
      // than a paywall and a retyped message. Only when nothing at all was
      // produced, though — half a comparison is still an answer on screen, and
      // refilling the composer under it would look like the send was ignored.
      if (capped) setNotice({ kind: "busy" });
      if (!capped || !everySideRefused) {
        const balanceRefusal = gatedReasons.find((r) => r !== "too_many_pending");
        if (balanceRefusal) {
          setGateReason(balanceRefusal === "login_required" ? "login_required" : "insufficient_balance");
        }
      }
      if (everySideRefused) {
        setMessages((m) => m.filter((x) => x.id !== userId));
        if (capped) {
          setInput(q);
          setAttachments(sentImages);
        }
      }
    }

    if (outcomes.includes("ok")) return "ok";
    return outcomes[0] ?? "error";
  }

  /**
   * Stops whatever is being written. See the AbortError branch in runSide().
   *
   * Both halves of a comparison, not just one: the button says "durdur", and
   * leaving the other model still typing after it is pressed would read as the
   * button not working.
   */
  function stop() {
    for (const c of abortsRef.current) c.abort();
  }

  /**
   * Walks a lesson task's steps, one generation each.
   *
   * Sequential rather than parallel, for three reasons that all point the same
   * way: the first step is what opens the thread (so the rest have somewhere to
   * land), the server caps concurrent generations per student, and a class of
   * twelve firing six parallel image jobs each is a bill nobody planned.
   *
   * Every step is an ordinary turn — same endpoint, same ore accounting, same
   * refund path — so the transcript ends up showing the whole exercise in
   * order, which is the part the teacher actually points at.
   *
   * Stops at the first step that doesn't come back "ok": a run that hit the
   * balance gate or a provider error should not keep spending on the rest.
   */
  async function runLesson(label: string, steps: LessonStep[], reference?: string) {
    if (busy || gated || run || steps.length === 0) return;
    runCancelRef.current = false;
    setRun({ label, done: 0, total: steps.length, step: steps[0].label });

    const images = reference ? [reference] : [];
    for (let i = 0; i < steps.length; i++) {
      if (runCancelRef.current) break;
      setRun({ label, done: i, total: steps.length, step: steps[i].label });
      const outcome = await sendOne(steps[i].prompt, images, false, true);
      if (outcome !== "ok") break;
    }

    setRun(null);
    runCancelRef.current = false;
  }

  /**
   * The sticker run needs a picture to hold on to, so it is the one task that
   * has a precondition: something in this thread must already be an image.
   * Re-encoding it here (rather than in the runner) keeps `runLesson` ignorant
   * of where a reference comes from.
   */
  async function runExpressions() {
    const last = [...messages].reverse().find((m) => m.role === "assistant" && !!m.imageUrl)?.imageUrl;
    if (!last) return;
    setRun({ label: "İfade turu", done: 0, total: LESSON_EXPRESSION_COUNT, step: "hazırlanıyor" });
    const reference = await imageUrlToAttachment(last);
    setRun(null);
    if (!reference) {
      setNotice({ kind: "reference" });
      return;
    }
    await runLesson("İfade turu", buildExpressionRun(), reference);
  }

  function selectTool(tool: PlaygroundTool) {
    // Mid-run a model change would split the task across two models and leave
    // the transcript claiming one made all of it.
    if (run) return;
    if (tool.status === "soon") {
      setNotice({ kind: "soon", tool: tool.name });
      return;
    }
    if (tool.id === activeTool.id) return;
    // Changing model no longer wipes the thread. What the new model can
    // actually see depends on its modality, and that's what the inline marker
    // below spells out — so the student reads it in the transcript, at the
    // exact point it applies, instead of in a toast that disappears.
    // A comparison names both of its models in the row itself, so it needs no
    // marker; one dropped between two halves would also break them apart.
    if (messages.length > 0 && !compareTool) {
      setMessages((m) => [...m, { role: "assistant", content: "", kind: "switch", toolId: tool.id }]);
    }
    setActiveTool(tool);
    // Comparison follows the left-hand model's modality: a picture and a
    // paragraph are not two answers to one question, and video is off the
    // table entirely (see canCompareWith). Rather than silently produce a
    // mismatched pair, the right-hand side is dropped and the student picks a
    // new one.
    if (compareTool && (!canCompareWith(tool) || compareTool.modality !== tool.modality)) {
      setCompareTool(null);
    }
    // The new model may take fewer images than the old one — or none — so
    // staged attachments don't survive a tool switch.
    setAttachments([]);
    setGateReason(null);
  }

  /**
   * Picks the right-hand model, or turns comparison on and off.
   *
   * Kept beside `selectTool` because the two share every guard that matters:
   * not mid-run, not a tool that isn't wired up yet, and — the one extra —
   * not the model already answering on the left, which would produce a
   * comparison of a model against itself.
   */
  function selectCompareTool(tool: PlaygroundTool | null) {
    if (run || busy) return;
    if (tool === null) {
      setCompareTool(null);
      return;
    }
    if (tool.status === "soon") {
      setNotice({ kind: "soon", tool: tool.name });
      return;
    }
    if (tool.id === activeTool.id) return;
    setCompareTool(tool);
    setGateReason(null);
  }

  /**
   * Turns comparison on with a sensible second model already chosen.
   *
   * Picking one for the student matters more than it sounds: the toggle is
   * worth nothing if pressing it opens an empty picker, and the obvious
   * default — another live model of the same modality — is right often enough
   * that most students will never open the picker at all.
   */
  function toggleCompare() {
    if (compareTool) {
      setCompareTool(null);
      return;
    }
    if (!canCompareWith(activeTool)) return;
    const candidate = ALL_TOOLS_FLAT.find(
      (t) => t.status === "live" && t.modality === activeTool.modality && t.id !== activeTool.id,
    );
    if (candidate) selectCompareTool(candidate);
  }

  function newChat() {
    // Switching threads mid-generation would land the reply in a transcript
    // it doesn't belong to, and leave the emptied one holding bubbles the
    // server is still filling in.
    if (busy || run) return;
    setMessages([]);
    setAttachments([]);
    setGateReason(null);
    applyChatId(null);
    // The thread being left is already stored, so re-reading the list here is
    // what makes it show up in the sidebar the moment it's left rather than
    // after the next send.
    setHistoryKey((k) => k + 1);
  }

  /**
   * Reopens a stored transcript. The tool is restored from the chat's own
   * tool_id, so continuing an old thread starts on the model it was made with
   * rather than on whatever happened to be selected.
   */
  async function openChat(id: string) {
    // Same reason newChat() refuses mid-generation — see the note there.
    if (id === chatId || loadingChat || busy || run) return;
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/playground/chats/${id}`);
      const data = await res.json();
      if (data.error) return;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      applyChatId(data.id);
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
        busy={busy || !!run}
        onOpenChat={openChat}
        onNewChat={newChat}
      />

      {/* One row: brand · model picker · balance · way out. The picker doubles
          as the "which AI am I talking to" readout, so no second nav row and
          no floating badge over the canvas are needed. */}
      <header className="sticky top-0 z-20 bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
          <Logo light lockupTone="ink" disableLink className="shrink-0" />
          <span aria-hidden className="hidden h-7 w-[2px] shrink-0 bg-outline-variant sm:block" />
          <ModelPicker activeTool={activeTool} onSelect={selectTool} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <OreMeter remaining={remaining} unlimited={unlimited} />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={newChat}
                disabled={busy || !!run}
                title={busy || run ? "Üretim bitince yeni sohbet açabilirsin" : "Yeni sohbet"}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-2.5 text-xs font-medium text-on-surface-variant transition hover:border-outline hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40 sm:px-3"
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
        {/* Soft paper rule under the bar. Deliberately not the navy ink the
            cards outline themselves with: a hard full-width stroke is what made
            the old bar read as a stock template block. */}
        <div aria-hidden className="h-[3px] bg-outline-variant" />
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
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="min-h-0 flex-1 overflow-y-auto pb-4"
          >
            <div className="space-y-6">
              {renderRows.map((row) =>
                row.kind === "pair" ? (
                  <ComparePair
                    key={row.key}
                    left={row.left}
                    right={row.right}
                    pendingIds={pendingIds}
                    fallbackTool={activeTool}
                    onView={setViewing}
                  />
                ) : row.msg.kind === "switch" ? (
                  <ModelSwitchMarker key={row.key} toolId={row.msg.toolId} memory={memory} />
                ) : (
                  <Bubble
                    key={row.key}
                    msg={row.msg}
                    tool={findTool(row.msg.toolId ?? "")?.tool ?? activeTool}
                    busy={!!row.msg.id && pendingIds.includes(row.msg.id)}
                    onView={setViewing}
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
        onStop={stop}
        // Only a streamed answer can be stopped: an image or a video request
        // keeps running on the server whether or not the browser is listening,
        // so a stop button there would lie about what it does.
        canStop={activeTool.modality === "text"}
        busy={busy}
        gated={gated}
        attachments={attachments}
        setAttachments={setAttachments}
        maxImages={maxImages}
        firstFrameMode={activeTool.modality === "video"}
        // Prompt cards exist for every modality; the runs are image-only (all
        // three come from image tasks in the decks, and a text tool carries a
        // conversation that a batch of independent turns would corrupt).
        // LessonTools hides itself when a tool has neither.
        lesson={{
          modality: activeTool.modality,
          categoryId: findTool(activeTool.id)?.category?.id,
          oreCost: activeTool.oreCost,
          balance: unlimited ? Number.POSITIVE_INFINITY : remaining,
          showRuns: activeTool.modality === "image",
          hasImageInThread: messages.some((m) => m.role === "assistant" && !!m.imageUrl),
          onUsePrompt: setInput,
          onRun: runLesson,
          onRunExpressions: runExpressions,
        }}
        aspect={activeTool.modality === "image" ? { value: aspectRatio, onChange: setAspectRatio } : null}
        run={run}
        onCancelRun={() => {
          runCancelRef.current = true;
          stop();
        }}
        memory={memory}
        setMemory={setMemory}
        memoryKind={memoryKind}
        memoryCarrying={memoryImages > 0}
        compare={{
          tool: compareTool,
          available: canCompareWith(activeTool),
          // Same modality as the left side and actually wired up. Comparing a
          // picture against a paragraph is not a comparison, and a "soon" tool
          // has nothing to answer with.
          options: ALL_TOOLS_FLAT.filter(
            (t) => t.status === "live" && t.modality === activeTool.modality && t.id !== activeTool.id,
          ),
          onToggle: toggleCompare,
          onPick: selectCompareTool,
        }}
        pendingCost={pendingCost}
        baseCost={activeTool.oreCost}
        onHeightChange={setComposerHeight}
        placeholder={findTool(activeTool.id)?.category?.id === "web" ? "Hayalindeki siteyi, oyunu tarif et..." : "Bir şeyler hayal et..."}
      />

      <MediaViewer item={viewing} onClose={() => setViewing(null)} />

      {/* Toast: a tool that isn't wired up yet. Model changes no longer
          need one — they leave a permanent marker in the thread instead. */}
      {notice && (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-2 rounded-full border border-secondary/25 bg-surface-high px-4 py-2.5 text-center text-sm text-on-surface">
            {notice.kind === "soon" ? (
              <>
                <Lock className="size-3.5 shrink-0 text-secondary" />
                <span>
                  <strong className="font-medium">{notice.tool}</strong> çok yakında burada olacak.
                </span>
              </>
            ) : notice.kind === "busy" ? (
              <>
                <Zap className="size-3.5 shrink-0 text-secondary" />
                <span>Aynı anda çok fazla üretim var — biri bitsin, sonra tekrar dene.</span>
              </>
            ) : (
              <>
                <Smile className="size-3.5 shrink-0 text-secondary" />
                <span>Referans görseli okuyamadım — sayfayı yenileyip tekrar dener misin?</span>
              </>
            )}
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
function OreMeter({ remaining, unlimited }: { remaining: number; unlimited: boolean }) {
  return (
    <span
      title={
        unlimited
          ? "Öğretmen hesabında cevher sınırı yok — üretimler doğrudan kurum bakiyesinden karşılanıyor."
          : `${formatOre(remaining)} cevher kaldı`
      }
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary/10 pl-2.5 pr-3"
    >
      <Zap className="size-3.5 shrink-0 fill-secondary text-secondary" />
      {/* ∞ rather than a big number: a teacher has no allowance to manage and
          nothing to top up, so any figure would be a countdown they can't act
          on. The tooltip says where the money actually comes from. */}
      <span
        key={unlimited ? "inf" : remaining}
        className="font-mono text-xs font-semibold leading-none tabular-nums text-secondary-bright duration-300 animate-in fade-in-0 zoom-in-95"
      >
        {unlimited ? "∞" : formatOre(remaining)}
      </span>
      <span className="hidden text-micro leading-none text-secondary/70 sm:inline">cevher</span>
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
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-micro transition",
        active ? "bg-primary/15 text-primary-bright" : "text-on-surface-variant hover:bg-surface-high hover:text-on-surface",
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
    active ? "bg-primary/15 text-primary-bright" : "text-on-surface-variant hover:bg-surface-high hover:text-on-surface",
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
        active ? "border-secondary/60 bg-secondary/15" : "border-outline-variant bg-surface-container hover:border-outline hover:bg-surface-high",
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
        <span className="flex min-w-0 items-center gap-1 text-micro font-semibold">
          <span className="truncate">{tool.name}</span>
          {tool.id === FEATURED_TOOL.id && <Sparkles className="size-2.5 shrink-0 text-secondary" />}
        </span>
      </div>
      <p className="line-clamp-2 text-micro leading-snug text-on-surface-variant/75">{tool.description}</p>
      {isSoon ? (
        <span className="mt-auto inline-flex items-center gap-0.5 font-mono text-micro uppercase tracking-wide text-on-surface-variant/60">
          <Lock className="size-2" /> Yakında
        </span>
      ) : (
        <span className="mt-auto font-mono text-micro text-secondary-bright/80">{oreLabel(tool)}</span>
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
            <span className="truncate text-mini font-semibold leading-none text-on-surface">{activeTool.name}</span>
            <span className="hidden truncate font-mono text-micro leading-none text-secondary-bright/70 sm:block">{oreLabel(activeTool)}</span>
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
                      className={cn("flex items-center gap-2 font-mono text-micro", sideItemClass(category === entry.id))}
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
                      <span className="font-mono text-micro font-semibold">{ayLabel}</span>
                      <span className="line-clamp-2 text-micro leading-snug opacity-80">{subtitle}</span>
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
                    <span className="shrink-0 font-mono text-micro uppercase tracking-wide text-secondary">Hafta {week.week}</span>
                    <span className="truncate text-micro font-semibold">{week.title}</span>
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
  onStop,
  canStop,
  busy,
  gated,
  attachments,
  setAttachments,
  maxImages,
  firstFrameMode,
  lesson,
  aspect,
  run,
  onCancelRun,
  memory,
  setMemory,
  memoryKind,
  memoryCarrying,
  compare,
  pendingCost,
  baseCost,
  placeholder,
  onHeightChange,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  canStop: boolean;
  busy: boolean;
  gated: boolean;
  attachments: string[];
  setAttachments: (updater: (prev: string[]) => string[]) => void;
  maxImages: number;
  /** Video tools: the attached picture is the clip's first frame, not context. */
  firstFrameMode: boolean;
  /** Prompt cards and classroom runs for this tool. */
  lesson: {
    modality: ToolModality;
    categoryId?: string;
    oreCost: number;
    balance: number;
    showRuns: boolean;
    hasImageInThread: boolean;
    onUsePrompt: (prompt: string) => void;
    onRun: (label: string, steps: LessonStep[]) => void;
    onRunExpressions: () => void;
  };
  /** Output shape picker, for the modalities that have one. */
  aspect: { value: AspectRatio; onChange: (value: AspectRatio) => void } | null;
  /** A lesson run in flight — takes the composer over while it walks. */
  run: RunState | null;
  onCancelRun: () => void;
  memory: boolean;
  setMemory: (v: boolean) => void;
  /** What memory means for the selected tool; null hides the switch. */
  memoryKind: "text" | "image" | null;
  /** Side-by-side mode: the toggle, and the right-hand model once it is on. */
  compare: {
    tool: PlaygroundTool | null;
    /** False for video, which is the one modality comparison stays off for. */
    available: boolean;
    options: PlaygroundTool[];
    onToggle: () => void;
    onPick: (tool: PlaygroundTool) => void;
  };
  /** Memory is on AND there is actually a picture in this thread to carry. */
  memoryCarrying: boolean;
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
        {/* A run owns the composer while it walks: the student can watch where
            it is and stop it, but not queue a second one on top. */}
        {run && (
          <div className="pg-card mb-2 flex items-center gap-3 px-3 py-2 duration-200 animate-in fade-in-0 slide-in-from-bottom-1">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface">
              <GraduationCap className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-mini font-semibold leading-snug text-on-surface">
                {run.label} — {Math.min(run.done + 1, run.total)}/{run.total}
              </span>
              <span className="block truncate font-mono text-micro text-on-surface-variant">{run.step}</span>
            </span>
            {/* Progress as segments, not a bar: the count is what a student is
                actually tracking ("kaç tane kaldı"), and each segment is one
                generation they paid for. */}
            <span aria-hidden className="hidden shrink-0 gap-1 sm:flex">
              {Array.from({ length: run.total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-4 rounded-full",
                    i < run.done ? "bg-[var(--pg-mint)]" : i === run.done ? "animate-pulse bg-[var(--pg-peach)]" : "bg-outline-variant",
                  )}
                />
              ))}
            </span>
            <button
              type="button"
              onClick={onCancelRun}
              className="shrink-0 rounded-full border-2 border-outline-variant px-2.5 py-1 font-mono text-micro text-on-surface-variant transition hover:border-outline hover:text-on-surface"
            >
              turu bitir
            </button>
          </div>
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
                    aria-label={firstFrameMode ? "İlk kareyi kaldır" : "Görseli kaldır"}
                    className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-outline-variant bg-surface text-on-surface-variant transition hover:text-on-surface"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <LessonTools
              prompt={input}
              modality={lesson.modality}
              categoryId={lesson.categoryId}
              oreCost={lesson.oreCost}
              balance={lesson.balance}
              disabled={busy || !!run}
              showRuns={lesson.showRuns}
              hasImageInThread={lesson.hasImageInThread}
              onUsePrompt={lesson.onUsePrompt}
              onRun={lesson.onRun}
              onRunExpressions={lesson.onRunExpressions}
            />
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
                  disabled={full || busy || !!run}
                  aria-label={firstFrameMode ? "İlk kareyi seç" : "Görsel ekle"}
                  title={
                    firstFrameMode
                      ? "İlk kareyi seç — video bu görselden başlar"
                      : full
                        ? `En fazla ${maxImages} görsel`
                        : "Görsel ekle"
                  }
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
            {busy && canStop ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Durdur"
                title="Durdur"
                className="pg-btn pg-btn--pink inline-flex size-10 shrink-0 items-center justify-center transition hover:brightness-105"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || busy || !!run}
                aria-label="Gönder"
                className="pg-btn inline-flex size-10 shrink-0 items-center justify-center transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </form>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Memory is hidden, not disabled, while comparing: a switch that
                cannot be moved invites a student to try to move it, and the
                reason it can't ("a comparison never carries memory") is
                already on the comparison toggle's own tooltip. */}
            {memoryKind && !compare.tool && (
              <MemorySwitch on={memory} onToggle={() => setMemory(!memory)} kind={memoryKind} carrying={memoryCarrying} />
            )}
            {aspect && <AspectPicker value={aspect.value} onChange={aspect.onChange} disabled={busy || !!run} />}
            <CompareSwitch
              on={!!compare.tool}
              available={compare.available}
              disabled={busy || !!run}
              onToggle={compare.onToggle}
            />
            {compare.tool && (
              <ComparePicker
                tool={compare.tool}
                options={compare.options}
                disabled={busy || !!run}
                onPick={compare.onPick}
              />
            )}
          </div>
          <p className="font-mono text-micro text-on-surface-variant/70">
            {compare.tool
              ? // A comparison is two generations and the price says so before
                // the send, not after it. Free-tier models included: "2 üretim"
                // is still the thing being explained.
                pendingCost > 0
                ? `2 üretim — toplam ${formatOre(pendingCost)} cevher`
                : "2 üretim — ikisi de ücretsiz"
              : firstFrameMode && attachments.length > 0
                ? "Video bu görselden başlayacak — ek ücreti yok"
                : firstFrameMode && memoryCarrying
                  ? "Son ürettiğin görselden başlayacak — ek ücreti yok"
                  : pendingCost > baseCost
                    ? `${memoryCarrying && attachments.length === 0 ? "Hafızalı" : "Görselli"} mesaj — ${formatOre(pendingCost)} cevher`
                    : "Gerçek yapay zeka ile üretiliyor — biraz zaman alabilir"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The comparison toggle.
 *
 * Deliberately built like the memory switch rather than as another icon
 * button: both answer "what happens when I press send", and a student who has
 * learned to look at that row for the answer should find this there too.
 *
 * Off for video, and shown rather than hidden in that state. A control that
 * vanishes on some models teaches that it is unreliable; one that stays put
 * and explains itself teaches where the line is.
 */
function CompareSwitch({
  on,
  available,
  disabled,
  onToggle,
}: {
  on: boolean;
  available: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const help = !available
    ? "Karşılaştırma videoda kapalı — iki video birden hem çok cevher harcar hem de dakikalarca sürer. Metin, görsel ve seste açık."
    : on
      ? "Karşılaştırma açık — aynı istek iki modele birden gidiyor, cevaplar yan yana geliyor. Hafıza bu modda kapalı: iki cevap arasındaki tek fark yazdığın istek olsun diye."
      : "Karşılaştırma — aynı isteği iki farklı modele gönder, cevaplarını yan yana gör. İki üretim, iki katı cevher.";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled || !available}
      onClick={onToggle}
      title={help}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border-2 py-1 pl-1.5 pr-3 text-micro font-medium transition disabled:pointer-events-none",
        !available
          ? "border-outline-variant/60 bg-surface-container text-on-surface-variant/40"
          : on
            ? "border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface"
            : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline hover:text-on-surface disabled:opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 px-[2px] transition-colors",
          on ? "border-[var(--pg-ink)] bg-surface-container" : "border-outline bg-surface-dim",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full transition-transform duration-200 ease-out",
            on ? "translate-x-[12px] bg-[var(--pg-ink)]" : "translate-x-0 bg-outline",
          )}
        />
      </span>
      <span>Karşılaştır</span>
    </button>
  );
}

/**
 * The right-hand model of a comparison.
 *
 * Its own small list rather than the header's full ModelPicker: the choice
 * here is narrow by construction — live models of the same modality as the
 * left-hand side — and offering the categories-and-curriculum browser for it
 * would present video models that a comparison cannot run and text models
 * that would not answer the same question.
 */
function ComparePicker({
  tool,
  options,
  disabled,
  onPick,
}: {
  tool: PlaygroundTool;
  options: PlaygroundTool[];
  disabled: boolean;
  onPick: (tool: PlaygroundTool) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={`Sağdaki model: ${tool.name} — ${tool.description}`}
          className="inline-flex h-[30px] min-w-0 shrink-0 items-center gap-1.5 rounded-full border-2 border-outline-variant bg-surface-container py-1 pl-1 pr-2 text-micro font-medium text-on-surface transition hover:border-outline disabled:pointer-events-none disabled:opacity-40"
        >
          <span aria-hidden className="shrink-0 font-mono text-micro text-on-surface-variant/60">B</span>
          {tool.provider ? (
            <ProviderBadge provider={tool.provider} className="size-5 shrink-0" />
          ) : (
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
              <tool.icon className="size-2.5" />
            </span>
          )}
          <span className="max-w-28 truncate">{tool.name}</span>
          <ChevronDown className={cn("size-3 shrink-0 text-on-surface-variant transition", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="pg-dialog w-[min(320px,92vw)] gap-0 p-1.5 ring-0">
        <p className="px-2 pb-1.5 pt-1 font-mono text-micro tracking-widest text-on-surface-variant/70">SAĞ TARAFTAKİ MODEL</p>
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
                "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition",
                t.id === tool.id ? "bg-secondary/12 text-on-surface" : "text-on-surface-variant hover:bg-surface-high hover:text-on-surface",
              )}
            >
              {t.provider ? (
                <ProviderBadge provider={t.provider} className="size-6 shrink-0" />
              ) : (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-high">
                  <t.icon className="size-3" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-mini font-semibold">{t.name}</span>
                <span className="block truncate font-mono text-micro text-on-surface-variant/70">{oreLabel(t)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Output shape, drawn rather than named.
 *
 * Four tiny rectangles in the real proportions — a ten-year-old picking a
 * poster shape should not have to know what "16:9" means, and the drawing is
 * both smaller and clearer than the words. Names and what each is good for
 * live in the tooltip, for whoever wants them.
 */
function AspectPicker({
  value,
  onChange,
  disabled,
}: {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Görselin şekli" className="pg-pill inline-flex items-center gap-0.5 p-1">
      {ASPECT_RATIOS.map((r) => {
        const active = r.value === value;
        const [w, h] = r.value.split(":").map(Number);
        // Longest edge always 13px, so the four sit on one optical baseline.
        const scale = 13 / Math.max(w, h);
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${r.label} — ${r.hint}`}
            title={`${r.label} (${r.value}) — ${r.hint}`}
            disabled={disabled}
            onClick={() => onChange(r.value)}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full transition disabled:opacity-40",
              active ? "bg-[var(--pg-sky)]" : "hover:bg-surface-dim",
            )}
          >
            <span
              aria-hidden
              className={cn("rounded-[2px] border-2", active ? "border-white" : "border-on-surface-variant")}
              style={{ width: w * scale, height: h * scale }}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The memory switch under the composer.
 *
 * Deliberately a real switch rather than a toggle button: what it controls is
 * a *state of the conversation*, not an action, and a student has to be able
 * to read which way it is set without pressing it. The caption changes with
 * the tool because the same setting does two different concrete things (see
 * `memory` in Playground), and a vague "hafıza açık" would teach nothing —
 * the whole point of exposing it is that a kid learns models only know what
 * you resend them.
 *
 * Mint when on, plain paper when off. Mint is the playground's "yes, this is
 * happening" colour; peach stays reserved for actions and ore.
 */
function MemorySwitch({
  on,
  onToggle,
  kind,
  carrying,
}: {
  on: boolean;
  onToggle: () => void;
  kind: "text" | "image";
  /** There is a picture in this thread that memory is actually carrying. */
  carrying: boolean;
}) {
  const help = on
    ? kind === "text"
      ? "Hafıza açık — model bu sohbette yazılanları okuyor. Kapatırsan her mesaj sıfırdan başlar."
      : carrying
        ? "Hafıza açık — bu sohbette ürettiğin son görselden devam edecek. Aynı karakteri koruyup sadece ifadeyi değiştirmek için bunu açık bırak."
        : "Hafıza açık — ilk görseli ürettiğinde, sonrakiler ondan devam edecek."
    : kind === "text"
      ? "Hafıza kapalı — model önceki mesajları görmüyor, her seferinde sıfırdan başlıyor."
      : "Hafıza kapalı — her görsel boş sayfadan başlıyor, öncekine benzemeyecek.";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title={help}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border-2 py-1 pl-1.5 pr-3 text-micro font-medium transition",
        on
          ? "border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface"
          : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline hover:text-on-surface",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 px-[2px] transition-colors",
          on ? "border-[var(--pg-ink)] bg-surface-container" : "border-outline bg-surface-dim",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full transition-transform duration-200 ease-out",
            on ? "translate-x-[12px] bg-[var(--pg-ink)]" : "translate-x-0 bg-outline",
          )}
        />
      </span>
      <span>Hafıza</span>
      {/* Only shown when memory has something concrete to hold on to, so the
          label never claims a continuity that does not exist yet. */}
      {on && kind === "image" && carrying && <span className="hidden opacity-70 sm:inline">· son görsel</span>}
    </button>
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
 * Image, video and audio tools never read the transcript: they are one-shot
 * generations and `send()` gives them only the prompt typed next. Telling a
 * student their new video model "continues the conversation" would be plainly
 * false. What an image or video model *can* carry, when the memory switch is
 * on, is the last picture this chat produced — as a reference, not as a
 * conversation — which is a third thing and gets its own sentence.
 */
function ModelSwitchMarker({ toolId, memory }: { toolId?: string; memory: boolean }) {
  const tool = findTool(toolId ?? "")?.tool;
  if (!tool) return null;

  const readsHistory = tool.modality === "text";
  const carriesImage = !readsHistory && (tool.maxImageInputs ?? 0) > 0;

  // Present tense on purpose. This is a marker left in the transcript, but
  // what it describes — how much the model can see — is a live setting the
  // student can flip under the composer, so it reads the switch rather than
  // freezing whatever was true when the handover happened.
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
      <p className="max-w-[46ch] text-center text-xs leading-relaxed text-on-surface-variant">{caption}</p>
    </div>
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
 *
 * Session-only: reasoning is never written to the transcript (see `Msg`), so
 * this appears while the answer streams and is gone if the chat is reopened.
 */
function ReasoningPanel({ text, live }: { text: string; live: boolean }) {
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? live;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !live) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text, open, live]);

  return (
    <div className="mb-1.5 overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container/60">
      <button
        type="button"
        onClick={() => setManual(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-micro font-medium text-on-surface-variant transition hover:text-on-surface"
      >
        <Brain className={cn("size-3.5 shrink-0 text-secondary", live && "animate-pulse")} />
        <span>{live ? "Düşünüyor…" : "Nasıl düşündü"}</span>
        <ChevronDown className={cn("ml-auto size-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div
          ref={bodyRef}
          className="max-h-40 overflow-y-auto border-t border-outline-variant/70 px-3 py-2 font-mono text-micro leading-relaxed whitespace-pre-wrap break-words text-on-surface-variant/80"
        >
          {text}
        </div>
      )}
    </div>
  );
}

/** Shared by the small actions that hang under a bubble. */
const BUBBLE_ACTION_CLASS =
  "inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-2 py-1 font-mono text-micro text-on-surface-variant shadow-sm transition hover:border-secondary/40 hover:text-on-surface disabled:opacity-50";

function Bubble({
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
    <div
      className={cn(
        "flex gap-2.5",
        column
          ? "justify-start"
          : isUser
            ? "justify-end animate-msg-in-right"
            : "justify-start animate-msg-in-left",
      )}
    >
      {/* Who is answering, shown once per turn — a message keeps the avatar of
          the model that actually wrote it, so changing model mid-thread never
          re-attributes the answers above. */}
      {!isUser && !column &&
        (tool.provider ? (
          <ProviderBadge provider={tool.provider} className="mt-0.5 size-7 ring-1 ring-on-surface/12" />
        ) : (
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
            <tool.icon className="size-3.5" />
          </span>
        ))}
      <div
        className={cn(
          "group relative min-w-0",
          column ? "w-full" : "max-w-[85%]",
          !isUser && !column && "flex-1 sm:w-auto sm:max-w-[85%] sm:flex-none",
        )}
      >
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
            {msg.attachments.map((src, i) => (
              // A data: URL held in this tab, never a routable asset the optimizer
              // could fetch.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="size-24 rounded-xl border border-outline-variant object-cover" />
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
            {/* eslint-disable-next-line @next/next/no-img-element -- data:/blob: preview of what the student just generated; never a routable URL. */}
            <img
              src={cutout?.url ?? msg.imageUrl}
              alt=""
              // The checkerboard only appears once there is transparency to show.
              // Without it a cut-out on a white card looks like nothing happened.
              className={cn(
                "pg-card max-h-96 rounded-tl-sm object-contain transition duration-300 hover:scale-[1.01]",
                cutout && "pg-checker",
              )}
            />
          </button>
        ) : msg.videoUrl ? (
          // A video can't be click-to-open — a click is play/pause — so the
          // affordance is its own corner button.
          <div className="relative">
            <video src={msg.videoUrl} controls className="pg-card max-h-96 rounded-tl-sm" />
            <button
              type="button"
              onClick={() => onView({ kind: "video", url: msg.videoUrl!, title: tool.name })}
              aria-label="Videoyu büyüt"
              title="Büyüt"
              className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full border-2 border-[var(--pg-ink)] bg-surface-container text-on-surface shadow-sm transition hover:bg-surface-high"
            >
              <Expand className="size-3.5" />
            </button>
          </div>
        ) : msg.audioUrl ? (
          <div className="flex items-center gap-2">
            <audio src={msg.audioUrl} controls className="w-full max-w-xs rounded-full" />
            <button
              type="button"
              onClick={() => onView({ kind: "audio", url: msg.audioUrl!, title: tool.name })}
              aria-label="Sesi büyüt"
              title="Büyüt"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant text-on-surface-variant transition hover:border-outline hover:text-on-surface"
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
              // run the full 85% of a wide desktop canvas. Inside a comparison
              // the column is already narrower than that, and capping again
              // would just strand the right-hand half against its own edge.
              "break-words rounded-2xl px-4 py-3 text-sm leading-relaxed",
              column ? "w-full" : "max-w-[62ch]",
              isUser
                // The student's own text is shown exactly as typed: parsing it
                // as markdown would reformat their words under them, and an
                // asterisk they meant literally would vanish.
                // Sky blue is the student's own voice throughout the
                // playground; peach is reserved for value and actions (ore,
                // send, the selected model) so the two never compete.
                ? "whitespace-pre-wrap rounded-br-sm border-2 border-primary/35 bg-primary-container text-on-primary-container"
                : "rounded-tl-sm border border-outline-variant bg-surface-container text-on-surface",
            )}
          >
            {msg.content ? (
              // Keyed so the answer fades in as it replaces the dots, rather
              // than snapping into place.
              <span key="content" className="block duration-300 animate-in fade-in-0">
                {isUser ? msg.content : <Markdown content={msg.content} />}
              </span>
            ) : (
              busy && (msg.videoPending ? <VideoWaitNotice /> : <TypingDots />)
            )}
          </div>
        )}
        {!isUser && !busy && msg.kind !== "code" && (msg.content || hasMedia) && (
          // Touch devices have no hover state — opacity-0 there would make these
          // permanently unreachable, so they're always visible below sm and only
          // hide-until-hover on pointer/desktop sizes.
          <div className="absolute -bottom-2.5 left-3 flex items-center gap-1.5 opacity-100 transition duration-200 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            <button onClick={hasMedia ? downloadMedia : () => {
              navigator.clipboard.writeText(msg.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }} aria-label={hasMedia ? "İndir" : "Kopyala"} className={BUBBLE_ACTION_CLASS}>
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
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-micro",
                  // A cut that took almost nothing or almost everything is a cut
                  // that went wrong — say so instead of letting the student
                  // download an empty PNG and find out on their phone.
                  cutout.removed < 0.05 || cutout.removed > 0.9
                    ? "border-error/40 text-error"
                    : "border-outline-variant text-on-surface-variant",
                )}
              >
                {cutout.removed < 0.05
                  ? "arka plan düz değil, silinemedi"
                  : cutout.removed > 0.9
                    ? "fazlasını sildi — tarife \"sade arka plan\" ekle"
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
 * made which — an avatar tucked beside a bubble is exactly the thing a student
 * scanning two pictures does not look at.
 *
 * Side by side only where there is room for it. Below `sm` the columns stack,
 * which is not a compromise so much as the only honest layout: two 180px-wide
 * pictures next to each other on a phone are not comparable, two full-width
 * ones one above the other are.
 */
function ComparePair({
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
      <div className="mb-2 flex items-center gap-1.5 font-mono text-micro tracking-widest text-on-surface-variant/70">
        <Columns2 className="size-3 shrink-0" />
        KARŞILAŞTIRMA
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map(({ msg, tool, busy }, i) => (
          <div key={msg.id ?? i} className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container/40 p-2.5">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              {tool.provider ? (
                <ProviderBadge provider={tool.provider} className="size-6 shrink-0 ring-1 ring-on-surface/12" />
              ) : (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
                  <tool.icon className="size-3" />
                </span>
              )}
              <span className="truncate text-mini font-semibold text-on-surface">{tool.name}</span>
              {/* Which half is which, for a student describing what they see
                  out loud. Letters rather than 1/2 so it never reads as a
                  ranking. */}
              <span className="ml-auto shrink-0 font-mono text-micro text-on-surface-variant/60">{i === 0 ? "A" : "B"}</span>
            </div>
            <Bubble msg={msg} tool={tool} busy={busy} onView={onView} column />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Models tend to wrap their HTML in a ```html fence despite being told not to — strip it if present. */
function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)\n?```/i);
  return (fenced ? fenced[1] : raw).trim();
}

function CodeOutputView({
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
    <div className="pg-card w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant px-2 py-1.5">
        <div className="inline-flex gap-0.5 rounded-full bg-surface-container p-0.5 font-mono text-micro">
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
          {tab === "preview" && (
            <button
              onClick={() => onView({ kind: "web", html: source, title: `${toolName} — önizleme` })}
              aria-label="Büyüt"
              title="Tam ekran aç"
              className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            >
              <Expand className="size-3" />
            </button>
          )}
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
        <iframe
          srcDoc={source}
          sandbox="allow-scripts"
          title="Önizleme"
          className="h-80 w-full bg-white sm:h-96"
        />
      ) : (
        <pre className="max-h-96 overflow-auto p-3 font-mono text-micro leading-relaxed text-on-surface-variant">
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
      {/* One dot per accent rather than three of the same: on paper a row of
          identical peach dots reads as a loading spinner, and this reads as
          the product. */}
      <span className="size-1.5 animate-typing-dot rounded-full bg-[var(--pg-mint)]" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-[var(--pg-peach)] [animation-delay:160ms]" />
      <span className="size-1.5 animate-typing-dot rounded-full bg-[var(--pg-pink)] [animation-delay:320ms]" />
    </span>
  );
}
