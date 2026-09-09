"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Lock, Smile, Zap } from "lucide-react";
import { whatsappHref } from "@/lib/site";
import { WhatsappIcon } from "@/components/ui/brand-icons";
import { CATEGORIES, FEATURED_TOOL, findTool, type PlaygroundTool } from "@/lib/playground/tools";
import { changedCount, defaultParams, exceedsCap, generationCost, imageBudget, nonDefaultParams, sanitizeParams, type StudioParams } from "@/lib/playground/params";
import { buildRows } from "@/lib/playground/transcript";
import { readEventStream } from "@/lib/playground/event-stream";
import { aspectRatiosFor, defaultAspectFor, type AspectRatio } from "@/lib/playground/aspect";
import { buildExpressionRun, buildLadder, LESSON_EXPRESSIONS, type LessonStep } from "@/lib/playground/lesson-runs";
import type { ChatSummary } from "@/lib/playground/chats";
import { MediaViewer, guessExtension, saveFile, type ViewerItem } from "./media-viewer";
import { ChatHistory } from "./chat-history";
import { TopBar } from "./top-bar";
import { Stage, type StageMode } from "./stage";
import { Composer, toAttachmentDataUrl, type MemoryControl } from "./composer";
import { ToolsPanel } from "./tools-panel";
import { QuickActions } from "./quick-actions";
import { ALL_TOOLS_FLAT } from "./model-picker";
import { HISTORY_LIMIT } from "./transcript";
import { buildStageItems, type GateReason, type Msg, type RunState } from "./types";

/** What the server rendered with — everything the first paint needs. */
export interface PlaygroundInitial {
  balance: number;
  unlimited: boolean;
  role: "admin" | "teacher" | "student";
  /** The balance is a placeholder (an admin's treasury) and must be re-read. */
  balanceStale: boolean;
  chats: ChatSummary[];
  name: string;
  weekNumber: number | null;
}

/** How one generation ended. Only "ok" lets a lesson run continue. */
type SendOutcome = "ok" | "gated" | "error" | "aborted";

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
 * eats two of the three concurrent generations a student is allowed at once.
 */
function canCompareWith(tool: PlaygroundTool): boolean {
  return tool.modality !== "video";
}

/**
 * Re-encodes an already-generated picture (a signed storage URL) as an
 * attachment data URL — for the sticker run's pinned reference, and for the
 * stage's "Varyasyon" and "Düzenle". Goes through the same downscale/encode
 * path as a picked file, so what reaches the server is indistinguishable
 * from a normal attachment and rides the already-verified `input_references`
 * route.
 */
async function imageUrlToAttachment(url: string): Promise<string | null> {
  const blob = await fetch(url)
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
  if (!blob || !blob.type.startsWith("image/")) return null;
  return toAttachmentDataUrl(new File([blob], "referans", { type: blob.type }));
}

/**
 * Video is the one async modality: ore is debited up front and the result
 * arrives minutes later, so how this loop ends decides whether a student pays
 * for nothing. The deadline is generous (the pricier models genuinely run
 * past five minutes), and giving up is an explicit server call — /abandon
 * re-checks the job and refunds the ore if it really never landed.
 */
const VIDEO_DEADLINE_MS = 10 * 60 * 1000;

async function pollVideoStatus(
  generationId: string,
  onUpdate: (patch: Partial<Msg>) => void,
  onDone: () => void,
  onLanded?: (outputPath: string | null) => void,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < VIDEO_DEADLINE_MS) {
    // Tight at first (short clips often land inside a minute), then relaxed.
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

/**
 * A boolean remembered across reloads (the memory switch, which side panels
 * are open), read through useSyncExternalStore so the server and the first
 * client paint agree — the server snapshot is the closed/default state, and
 * React re-renders with the stored one once it hydrates. Reading storage in
 * an effect and setting state would do the same job with an extra render
 * and a lint warning; this is the sanctioned shape.
 */
const flagListeners = new Set<() => void>();
function subscribeFlags(cb: () => void) {
  flagListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    flagListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function usePersistedFlag(key: string, fallback: () => boolean, serverValue = false): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribeFlags,
    () => {
      try {
        const v = window.localStorage.getItem(key);
        return v === null ? fallback() : v === "1";
      } catch {
        return fallback();
      }
    },
    () => serverValue,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Private mode; nothing to remember into. The listeners still fire so
        // the UI moves even if it will not be remembered.
      }
      flagListeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}

/**
 * Studio settings, remembered per model.
 *
 * Per model rather than globally because the dials are not the same set: a
 * seed locked on Seedream means nothing to Veo, and carrying "1080p" onto a
 * model whose ceiling is 720p would silently cost a student their choice.
 * `sanitizeParams` runs on the way OUT of storage too, so a stored value the
 * catalog no longer allows (or that a role change took away) is dropped
 * rather than shown as a setting that will not be honoured.
 *
 * Read through the same `useSyncExternalStore` store the panel flags use, so
 * the server render and the first client paint agree without an effect that
 * sets state on mount. Both snapshots are memoised by the raw stored string:
 * `getSnapshot` must return the same reference until something really
 * changes, or React re-renders forever.
 */
function studioKey(tool: PlaygroundTool): string {
  return `pg-studio-${tool.id}`;
}

const studioCache = new Map<string, { raw: string | null; value: StudioParams }>();
const studioDefaults = new Map<string, StudioParams>();

function defaultStudio(tool: PlaygroundTool, role: PlaygroundInitial["role"]): StudioParams {
  const key = `${tool.id}:${role}`;
  let value = studioDefaults.get(key);
  if (!value) {
    value = defaultParams(tool, role);
    studioDefaults.set(key, value);
  }
  return value;
}

function readStudio(tool: PlaygroundTool, role: PlaygroundInitial["role"]): StudioParams {
  const key = studioKey(tool);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Private mode; the defaults below are the whole story.
  }
  const cached = studioCache.get(key);
  if (cached && cached.raw === raw) return cached.value;
  let value = defaultStudio(tool, role);
  if (raw) {
    try {
      value = sanitizeParams(tool, role, JSON.parse(raw));
    } catch {
      // Corrupt entry — the defaults stand.
    }
  }
  studioCache.set(key, { raw, value });
  return value;
}

function usePersistedStudio(tool: PlaygroundTool, role: PlaygroundInitial["role"]): [StudioParams, (next: StudioParams) => void] {
  const value = useSyncExternalStore(
    subscribeFlags,
    () => readStudio(tool, role),
    () => defaultStudio(tool, role),
  );
  const set = useCallback(
    (next: StudioParams) => {
      const key = studioKey(tool);
      const raw = JSON.stringify(next);
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        // Private mode; the dials still work for this session.
      }
      // Seeded straight into the cache so the next snapshot is this object,
      // whether or not the write above actually landed.
      studioCache.set(key, { raw, value: next });
      flagListeners.forEach((l) => l());
    },
    [tool],
  );
  return [value, set];
}

/**
 * "8 sn · 1080p · sesli — 24 cevher": what the current dials mean, in the
 * order a student reads them, ending in the price. Both the studio panel and
 * the composer's own line show the same numbers, from the same function.
 */
function studioSummary(tool: PlaygroundTool, params: StudioParams, ore: number): string {
  const parts: string[] = [];
  if (params.duration) parts.push(`${params.duration} sn`);
  if (params.videoResolution) parts.push(String(params.videoResolution));
  if (params.resolution) parts.push(String(params.resolution));
  if (tool.modality === "video" && params.generateAudio !== undefined) parts.push(params.generateAudio === false ? "sessiz" : "sesli");
  if (params.transparent === true) parts.push("şeffaf");
  if (typeof params.seed === "number") parts.push(`tohum ${params.seed}`);
  if (params.webSearch === true) parts.push("internetli");
  const price = ore > 0 ? `${Math.round(ore * 100) / 100} cevher` : "ücretsiz";
  return parts.length > 0 ? `${parts.join(" · ")} — ${price}` : price;
}

export function Playground({ initial }: { initial: PlaygroundInitial }) {
  const [activeTool, setActiveTool] = useState<PlaygroundTool>(FEATURED_TOOL);
  /**
   * The second model in a comparison, or null when comparison is off.
   * `activeTool` is always the left-hand side, so this is the only extra piece
   * of state the mode needs.
   */
  const [compareTool, setCompareTool] = useState<PlaygroundTool | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  /** The replies still being generated, by message id. */
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const busy = pendingIds.length > 0;
  const [remaining, setRemaining] = useState(initial.balance);
  /** A teacher — no allowance at all; the meter shows ∞ and the gate is off. */
  const [unlimited, setUnlimited] = useState(initial.unlimited);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  /** Server-side thread this transcript belongs to; null until the first turn. */
  const [chatId, setChatId] = useState<string | null>(null);
  /**
   * The same value, readable synchronously — a lesson run fires several
   * generations from one handler and the first of them opens the thread.
   */
  const chatIdRef = useRef<string | null>(null);
  /**
   * Whether this thread carries anything forward into the next generation:
   * the transcript for text, the last picture as a reference for image/video.
   */
  const [memory, setMemory] = usePersistedFlag("pg-memory", () => true, true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | null>(() => defaultAspectFor(FEATURED_TOOL));
  /** The studio dials for the model currently selected, remembered per model. */
  const [studioParams, setStudioParams] = usePersistedStudio(activeTool, initial.role);
  /** A lesson run in flight, or null. Blocks the composer while it walks. */
  const [run, setRun] = useState<RunState | null>(null);
  /** The one thing currently open full-screen, or null. */
  const [viewing, setViewing] = useState<ViewerItem | null>(null);
  /** Set by the run's stop button; checked between steps. */
  const runCancelRef = useRef(false);
  /** The history list, seeded by the server and re-read after every turn. */
  const [chats, setChats] = useState<ChatSummary[]>(initial.chats);
  const [historyKey, setHistoryKey] = useState(0);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  // Both panels float over the workspace, so neither costs the stage any
  // width — but neither opens by itself either. A studio opens on the work,
  // not on its own chrome; the two buttons are one click away in the bar and
  // in the composer, and the choice is remembered.
  const [historyOpen, setHistoryOpen] = usePersistedFlag("pg-history-open", () => false);
  const [toolsOpen, setToolsOpen] = usePersistedFlag("pg-tools-open", () => false);
  /** Which output the gallery shows; null follows the newest. */
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** In-flight generations, so the stop button can cancel them (both halves of a comparison). */
  const abortsRef = useRef<Set<AbortController>>(new Set());
  /** Whether the transcript is at (or near) its end, so streaming never yanks a reader back down. */
  const pinnedRef = useRef(true);

  function applyChatId(id: string | null) {
    chatIdRef.current = id;
    setChatId(id);
  }

  const category = findTool(activeTool.id)?.category ?? null;
  const categoryId = category?.id ?? null;
  const isWeb = categoryId === "web";

  // 0 means this model can't see images at all, which is what hides the
  // attach button. The server enforces the same ceiling regardless.
  const maxImages = imageBudget(activeTool, studioParams);
  const memoryKind: "text" | "image" | null = activeTool.modality === "text" ? "text" : maxImages > 0 ? "image" : null;
  // Mirrors the server's carry-forward rule: the most recent user turn's
  // images are resent with the next message and billed again.
  const carriedCount =
    memory && !compareTool && activeTool.modality === "text"
      ? Math.min(
          [...messages].reverse().find((m) => m.role === "user" && m.content.trim())?.attachments?.length ?? 0,
          Math.max(0, maxImages - attachments.length),
        )
      : 0;
  // The picture memory would carry into an image/video generation. The
  // conditions mirror the server exactly (see `remembered` in generate/route.ts).
  const memoryImages =
    memory && !compareTool && memoryKind === "image" && chatId !== null && attachments.length === 0 && messages.some((m) => m.role === "assistant" && !!m.imageUrl)
      ? 1
      : 0;
  // Priced as composed right now — attachments, carried images, and both
  // halves of a comparison — so the gate refuses a send the student can only
  // half afford.
  const pendingCost =
    generationCost(activeTool, { imageCount: attachments.length + carriedCount + memoryImages, params: studioParams }) +
    // The second side of a comparison runs on the same dials where the model
    // has them, and on its own defaults where it does not.
    (compareTool ? generationCost(compareTool, { imageCount: attachments.length, params: sanitizeParams(compareTool, initial.role, studioParams) }) : 0);
  // Too expensive to run at all — a dial combination past the per-generation
  // ceiling. Separate from the wallet gate: this one is not about how much a
  // student has, and topping them up would not fix it.
  const overCap = exceedsCap(activeTool, { imageCount: attachments.length + carriedCount + memoryImages, params: studioParams });
  const gated = gateReason !== null || overCap || (!unlimited && remaining < pendingCost);

  /** The transcript, folded so a comparison's two replies draw as one row. */
  const renderRows = useMemo(() => buildRows(messages), [messages]);
  const stageItems = useMemo(() => buildStageItems(messages), [messages]);
  const shownIndex = Math.min(stageIndex ?? stageItems.length - 1, Math.max(stageItems.length - 1, 0));
  const stageMode: StageMode = messages.length === 0 ? "empty" : activeTool.modality === "text" ? "transcript" : "gallery";

  const updateParam = useCallback(
    (key: string, value: StudioParams[string]) => setStudioParams({ ...studioParams, [key]: value }),
    [studioParams, setStudioParams],
  );

  const resetParams = useCallback(() => setStudioParams(defaultStudio(activeTool, initial.role)), [activeTool, initial.role, setStudioParams]);

  /**
   * Loads a past result's settings back into the studio.
   *
   * Run through `sanitizeParams` first: the stored record is from whatever
   * model and role made it, and the dials it names may not exist on the model
   * selected now. Missing keys fall back to this model's defaults, so a
   * restore never leaves a dial reading a value the request will not carry.
   */
  const restoreParams = useCallback(
    (reply: Msg) => {
      if (!reply.params) return;
      setStudioParams(sanitizeParams(activeTool, initial.role, reply.params));
      setToolsOpen(true);
    },
    [activeTool, initial.role, setStudioParams, setToolsOpen],
  );

  const studioChanged = changedCount(activeTool, initial.role, studioParams);

  const aspectOptions = useMemo(() => aspectRatiosFor(activeTool), [activeTool]);
  const ladder = useMemo(() => buildLadder(input), [input]);
  const hasImageInThread = messages.some((m) => m.role === "assistant" && !!m.imageUrl);

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

  // The server already rendered the real figure; only an admin's treasury
  // placeholder needs a second read.
  useEffect(() => {
    if (initial.balanceStale) refreshBalance();
  }, [initial.balanceStale, refreshBalance]);

  /**
   * Below `lg` the two panels would sit on top of each other (both are
   * near-full-width sheets there), so opening one closes the other. On a wide
   * screen they float on opposite edges and can both stay open.
   */
  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && toolsOpen && !window.matchMedia("(min-width: 1024px)").matches) setToolsOpen(false);
  }
  function toggleTools() {
    const next = !toolsOpen;
    setToolsOpen(next);
    if (next && historyOpen && !window.matchMedia("(min-width: 1024px)").matches) setHistoryOpen(false);
  }

  // Re-read the list whenever a turn could have changed it. The first copy
  // came with the page, so the very first run is skipped.
  const historyFirstRun = useRef(true);
  useEffect(() => {
    if (historyFirstRun.current) {
      historyFirstRun.current = false;
      return;
    }
    let alive = true;
    fetch("/api/playground/chats")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.chats)) setChats(d.chats);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [historyKey]);

  /**
   * Finish anything the last visit left hanging: a video that was rendering
   * when the tab closed. Fire and forget; only refreshes when it settled
   * something.
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

  /** Patches one reply, by id. */
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
   * Drains one streamed answer into the transcript. Text lands at ~16fps and
   * the final chunk always flushes; `kind` stays "text" for the whole stream
   * even for the web tool, so the preview iframe is not rebuilt per chunk.
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
      patchMsg(targetId, { content: answer, reasoning: thinking || undefined, kind: force ? kind : "text" });
    };

    for await (const { event, data } of readEventStream(body)) {
      if (event === "meta") {
        if (data.kind === "code") kind = "code";
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
        if (!answer) answer = "Bu isteği oluşturamadım, başka bir şey dener misin? 💫";
        // Drop back to a plain bubble: for the web tool `kind` is "code", which
        // would render this apology inside the preview iframe.
        kind = "text";
      }
    }

    flush(true);
  }

  /** What the composer calls. Hands the typed text and staged pictures to `sendOne`, and clears both. */
  async function send(text: string) {
    if (busy || gated || run) return;
    const sentImages = attachments;
    setInput("");
    setAttachments([]);
    await sendOne(text, sentImages);
  }

  /**
   * One side of a send: one model, one bubble, start to finish. A comparison
   * runs two of these against the same prompt.
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
    targetId: string;
    /** Held by the second side of a comparison until the first has been told the thread id. */
    waitForChat?: Promise<void>;
    onChatOpened?: () => void;
    onGated: (reason: string) => void;
  }): Promise<SendOutcome> {
    if (waitForChat) await waitForChat;

    const controller = new AbortController();
    abortsRef.current.add(controller);
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
          // Re-checked server-side against the caller's real role before a
          // single one of them reaches a model (see sanitizeParams).
          params: tool.id === activeTool.id ? studioParams : sanitizeParams(tool, initial.role, studioParams),
        }),
        signal: controller.signal,
      });

      // Text streams; every other modality answers as one JSON body.
      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        await consumeTextStream(res.body, targetId, () => onChatOpened?.());
        return "ok";
      }

      const data = await res.json();

      if (data.gated) {
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
        // A video can end in a refund, so the balance is re-read once it settles.
        refreshBalance();
      }
      return "ok";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
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
      finishPending(targetId);
    }
  }

  /**
   * One turn, start to finish — one model, or two side by side. Lesson runs
   * pass `memoryOverride: false` (continuity comes from the pinned reference,
   * never from memory) and `forceSingle: true` (a six-step run must not
   * silently double because a toggle was left on).
   */
  async function sendOne(text: string, sentImages: string[], memoryOverride?: boolean, forceSingle?: boolean): Promise<SendOutcome> {
    const q = text.trim();
    if (!q) return "error";

    const secondSide = forceSingle ? null : compareTool;
    // A comparison never carries memory: the prompt has to be the only
    // difference between the two answers.
    const sides = secondSide ? [activeTool, secondSide] : [activeTool];
    const useMemory = secondSide ? false : (memoryOverride ?? memory);

    const priorTurns =
      useMemory && activeTool.modality === "text" ? messages.filter((m) => m.kind !== "switch" && m.content.trim()).slice(-HISTORY_LIMIT) : [];
    // Only the most recent user turn's images are replayed — that's all the server will use.
    const lastUserIndex = priorTurns.map((m) => m.role).lastIndexOf("user");
    const history = priorTurns.map((m, i) => ({ role: m.role, content: m.content, images: i === lastUserIndex ? (m.attachments ?? []) : [] }));

    const userId = newMsgId();
    const sideIds = sides.map(() => newMsgId());

    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: q, attachments: sentImages },
      ...sides.map((tool, i) => ({
        id: sideIds[i],
        role: "assistant" as const,
        content: "",
        toolId: tool.id,
        compare: secondSide ? ((i === 0 ? "a" : "b") as "a" | "b") : undefined,
        // The dials this reply is being made with, so the stage can show them
        // under the result without waiting for a round trip. Only the moved
        // ones, matching what the server writes to `ai_generations.params`.
        params: nonDefaultParams(tool, initial.role, sanitizeParams(tool, initial.role, studioParams)),
      })),
    ]);
    setPendingIds((ids) => [...ids, ...sideIds]);
    // The stage follows the newest output.
    setStageIndex(null);

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
          if (i === 0) releaseChatGate();
        }),
      ),
    );

    if (gatedReasons.length > 0) {
      const capped = gatedReasons.includes("too_many_pending");
      const everySideRefused = gatedReasons.length === sides.length;
      if (capped) setNotice({ kind: "busy" });
      if (!capped || !everySideRefused) {
        const balanceRefusal = gatedReasons.find((r) => r !== "too_many_pending");
        if (balanceRefusal) setGateReason(balanceRefusal === "login_required" ? "login_required" : "insufficient_balance");
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

  /** Stops whatever is being written — both halves of a comparison. */
  function stop() {
    for (const c of abortsRef.current) c.abort();
  }

  /**
   * Walks a lesson task's steps, one generation each, sequentially: the
   * first step opens the thread, the server caps concurrent generations, and
   * a class of twelve firing six parallel jobs each is a bill nobody planned.
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

  /** The sticker run: something in this thread must already be an image. */
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
    if (run) return;
    if (tool.status === "soon") {
      setNotice({ kind: "soon", tool: tool.name });
      return;
    }
    if (tool.id === activeTool.id) return;
    // Changing model no longer wipes the thread; the inline marker spells out
    // what the new model can see. A comparison names both models itself.
    if (messages.length > 0 && !compareTool) {
      setMessages((m) => [...m, { role: "assistant", content: "", kind: "switch", toolId: tool.id }]);
    }
    setActiveTool(tool);
    // The chosen shape survives the switch when the new model draws it too;
    // otherwise it falls back to the model's own default.
    setAspectRatio((current) => (current && tool.aspectRatios?.includes(current) ? current : defaultAspectFor(tool)));
    if (compareTool && (!canCompareWith(tool) || compareTool.modality !== tool.modality)) setCompareTool(null);
    // The new model may take fewer images than the old one — or none.
    setAttachments([]);
    setGateReason(null);
    setStageIndex(null);
  }

  /** A category chip: the first live model of that category. */
  function selectCategory(id: string) {
    const first = CATEGORIES.find((c) => c.id === id)?.tools.find((t) => t.status === "live");
    if (first) selectTool(first);
  }

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

  /** Turns comparison on with a sensible second model already chosen. */
  function toggleCompare() {
    if (compareTool) {
      setCompareTool(null);
      return;
    }
    if (!canCompareWith(activeTool)) return;
    const candidate = ALL_TOOLS_FLAT.find((t) => t.status === "live" && t.modality === activeTool.modality && t.id !== activeTool.id);
    if (candidate) selectCompareTool(candidate);
  }

  function newChat() {
    if (busy || run) return;
    setMessages([]);
    setAttachments([]);
    setGateReason(null);
    applyChatId(null);
    setStageIndex(null);
    setHistoryKey((k) => k + 1);
    textareaRef.current?.focus();
  }

  /** Reopens a stored transcript on the model it was made with. */
  async function openChat(id: string) {
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
      setStageIndex(null);
      const tool = findTool(data.toolId)?.tool;
      if (tool && tool.status === "live" && tool.id !== activeTool.id) {
        setActiveTool(tool);
        setAspectRatio((current) => (current && tool.aspectRatios?.includes(current) ? current : defaultAspectFor(tool)));
        if (compareTool && (!canCompareWith(tool) || compareTool.modality !== tool.modality)) setCompareTool(null);
      }
      // The panel covers the stage on a narrow screen, and even on a wide one
      // the point of the tap was to look at the thread — not at the list.
      setHistoryOpen(false);
    } catch {
      // Leave the current thread on screen.
    } finally {
      setLoadingChat(false);
    }
  }

  async function archiveChat(id: string) {
    setArchivingId(id);
    // Optimistic: the row goes immediately, and comes back on the next refresh
    // if the request failed. A soft delete is cheap to be wrong about.
    setChats((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/playground/chats/${id}`, { method: "DELETE" }).catch(() => {});
    setArchivingId(null);
    if (id === chatId) newChat();
  }

  // ---- Stage actions ----------------------------------------------------
  const canReference = activeTool.modality === "image" && maxImages > 0;

  async function regenerate(promptText: string) {
    if (busy || gated || run) return;
    await sendOne(promptText, []);
  }

  async function variation(promptText: string, imageUrl: string) {
    if (busy || gated || run || !canReference) return;
    const ref = await imageUrlToAttachment(imageUrl);
    if (!ref) {
      setNotice({ kind: "reference" });
      return;
    }
    // The reference is explicit, so memory's own carried picture stays out.
    await sendOne(promptText, [ref], false);
  }

  async function edit(promptText: string, imageUrl: string) {
    if (busy || run || !canReference) return;
    setInput(promptText);
    const ref = await imageUrlToAttachment(imageUrl);
    if (ref) setAttachments([ref]);
    else setNotice({ kind: "reference" });
    textareaRef.current?.focus();
  }

  function download(reply: Msg) {
    const url = reply.imageUrl ?? reply.videoUrl ?? reply.audioUrl;
    if (!url) return;
    const kind = reply.imageUrl ? "png" : reply.videoUrl ? "mp4" : "mp3";
    void saveFile(url, `nebula-${reply.imageUrl ? "gorsel" : reply.videoUrl ? "video" : "ses"}.${guessExtension(url, kind)}`);
  }

  // ---- Derived bits for the bar ------------------------------------------
  const firstPrompt = messages.find((m) => m.role === "user" && m.content.trim())?.content;
  const title = firstPrompt ?? chats.find((c) => c.id === chatId)?.preview ?? "Yeni sohbet";
  const messageCount = messages.filter((m) => m.kind !== "switch").length;
  const subline = [initial.weekNumber ? `${initial.weekNumber}. HAFTA` : null, messageCount > 0 ? `${messageCount} MESAJ` : null]
    .filter(Boolean)
    .join(" · ");

  const memoryControl: MemoryControl | null = memoryKind
    ? { on: memory, kind: memoryKind, carrying: memoryImages > 0, onToggle: () => setMemory(!memory) }
    : null;
  const aspectControl = aspectOptions.length > 0 ? { options: aspectOptions, value: aspectRatio, onChange: setAspectRatio } : null;
  const studioControl = {
    params: studioParams,
    onChange: updateParam,
    onReset: resetParams,
    changed: studioChanged,
    // Priced for one side only: the comparison surcharge belongs on the
    // composer's own line, next to the button that would spend it.
    costLine: studioSummary(activeTool, studioParams, generationCost(activeTool, { imageCount: attachments.length + carriedCount + memoryImages, params: studioParams })),
    atCeiling: overCap,
  };
  const compareControl = {
    tool: compareTool,
    available: canCompareWith(activeTool),
    options: ALL_TOOLS_FLAT.filter((t) => t.status === "live" && t.modality === activeTool.modality && t.id !== activeTool.id),
    onToggle: toggleCompare,
    onPick: selectCompareTool,
  };
  const locked = busy || !!run;

  return (
    <div className="pg-shell">
      <TopBar
        title={title}
        subline={subline}
        name={initial.name}
        role={initial.role}
        tool={activeTool}
        onSelectTool={selectTool}
        pickerLocked={locked}
        remaining={remaining}
        unlimited={unlimited}
        historyOpen={historyOpen}
        canNewChat={!locked}
        onNewChat={newChat}
        onToggleHistory={toggleHistory}
      />

      <div className="pg-body" data-history={historyOpen} data-tools={toolsOpen}>
        <Stage
          mode={stageMode}
          tool={activeTool}
          rows={renderRows}
          pendingIds={pendingIds}
          memory={memory}
          onView={setViewing}
          scrollRef={scrollRef}
          onScroll={(el) => {
            pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          items={stageItems}
          index={shownIndex}
          onIndex={setStageIndex}
          actions={{
            onRegenerate: (item) => void regenerate(item.prompt.content),
            onVariation: (item, reply) => reply.imageUrl && void variation(item.prompt.content, reply.imageUrl),
            onEdit: (item, reply) => reply.imageUrl && void edit(item.prompt.content, reply.imageUrl),
            onDownload: download,
            onCompare: toggleCompare,
            compareOn: !!compareTool,
            compareAvailable: canCompareWith(activeTool),
            canReference,
            onRestoreParams: restoreParams,
            role: initial.role,
            disabled: locked || gated,
          }}
          footer={gated ? <GatedCallout gateReason={gateReason} /> : undefined}
        />

        <Composer
          input={input}
          setInput={setInput}
          textareaRef={textareaRef}
          onSend={send}
          onStop={stop}
          // Only a streamed answer can be stopped: an image or a video request
          // keeps running on the server whether or not the browser is listening.
          canStop={activeTool.modality === "text"}
          busy={busy}
          gated={gated}
          gatedHint={
            overCap
              ? "Bu ayarlar tek üretim sınırını aşıyor — süreyi ya da çözünürlüğü düşür"
              : gated
                ? "Cevherin bitti — yeni üretim için öğretmenine yaz"
                : null
          }
          attachments={attachments}
          setAttachments={setAttachments}
          maxImages={maxImages}
          firstFrameMode={activeTool.modality === "video"}
          run={run}
          onCancelRun={() => {
            runCancelRef.current = true;
            stop();
          }}
          toolsOpen={toolsOpen}
          studioCount={studioChanged}
          onToggleTools={toggleTools}
          compareOn={!!compareTool}
          pendingCost={pendingCost}
          placeholder={isWeb ? "Hayalindeki siteyi, oyunu tarif et..." : activeTool.modality === "text" ? "Bir şey sor, bir şey anlat..." : "Ne üretelim? Tarif et..."}
          quick={
            <QuickActions
              tool={activeTool}
              categoryId={categoryId ?? undefined}
              prompt={input}
              ladder={ladder}
              oreCost={activeTool.oreCost}
              balance={unlimited ? Number.POSITIVE_INFINITY : remaining}
              disabled={locked || gated}
              hasImageInThread={hasImageInThread}
              onUsePrompt={(p) => {
                setInput(p);
                textareaRef.current?.focus();
              }}
              onRun={runLesson}
              onRunExpressions={runExpressions}
              compare={compareControl}
            />
          }
        />
      </div>

      {/* The two panels. Siblings of .pg-body, not children: they are
          positioned against the shell, so the padding that slides the work
          column aside never drags them along with it. */}
      <ChatHistory
        open={historyOpen}
        chats={chats}
        activeChatId={chatId}
        busy={locked || loadingChat}
        busyId={archivingId}
        onOpenChat={openChat}
        onNewChat={newChat}
        onArchive={archiveChat}
        onClose={toggleHistory}
      />

      <ToolsPanel
        open={toolsOpen}
        onClose={toggleTools}
        tool={activeTool}
        categoryId={categoryId}
        onSelectTool={selectTool}
        onSelectCategory={selectCategory}
        aspect={aspectControl}
        memory={memoryControl}
        compare={compareControl}
        payload={{
          tool: activeTool,
          categoryId,
          prompt: input,
          aspectRatio,
          attachments,
          memory,
          historyTurns: messages.filter((m) => m.kind !== "switch" && m.content.trim()).length,
          carriesReference: hasImageInThread,
          role: initial.role,
          params: studioParams,
        }}
        studio={studioControl}
        disabled={locked}
      />

      {/* Scrim for the narrow-screen sheets (hidden by CSS from lg up). */}
      {(historyOpen || toolsOpen) && (
        <div
          className="pg-scrim"
          aria-hidden
          onClick={() => {
            if (historyOpen) toggleHistory();
            if (toolsOpen) toggleTools();
          }}
        />
      )}

      <MediaViewer item={viewing} onClose={() => setViewing(null)} />

      {notice && (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pn-card pn-card--float flex items-center gap-2 px-4 py-2.5 text-center text-[13px] font-semibold text-on-surface duration-200 animate-in fade-in-0 slide-in-from-bottom-2">
            {notice.kind === "soon" ? (
              <>
                <Lock className="size-3.5 shrink-0 text-[color:var(--pn-peach-ink)]" />
                <span>
                  <strong>{notice.tool}</strong> çok yakında burada olacak.
                </span>
              </>
            ) : notice.kind === "busy" ? (
              <>
                <Zap className="size-3.5 shrink-0 text-[color:var(--pn-peach-ink)]" />
                <span>Aynı anda çok fazla üretim var — biri bitsin, sonra tekrar dene.</span>
              </>
            ) : (
              <>
                <Smile className="size-3.5 shrink-0 text-[color:var(--pn-peach-ink)]" />
                <span>Referans görseli okuyamadım — sayfayı yenileyip tekrar dener misin?</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GatedCallout({ gateReason }: { gateReason: GateReason }) {
  const gatedMessage =
    gateReason === "login_required"
      ? "Video oluşturma sadece giriş yapmış öğrenciler için açık."
      : "Cevherin bitti. Daha fazlası için öğretmenine ya da bize yaz!";

  return (
    <div className="pg-center mt-2 flex shrink-0 flex-col items-center gap-3 rounded-[14px] border border-[color:var(--pn-peach-line)] bg-[color:var(--pn-peach-tint)] p-3 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[color:var(--pn-peach)] text-[color:var(--pn-peach-ink-strong)]">
          <Lock className="size-4" strokeWidth={1.9} />
        </span>
        <p className="text-[13px] font-semibold text-on-surface">{gatedMessage}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/dashboard" className="pn-btn pn-btn--sm pn-btn--paper">
          Panele dön
        </Link>
        <Link href={whatsappHref()} target="_blank" rel="noreferrer" className="pn-btn pn-btn--sm pn-btn--mint">
          <WhatsappIcon className="size-4" />
          WhatsApp&apos;tan yaz
        </Link>
      </div>
    </div>
  );
}
