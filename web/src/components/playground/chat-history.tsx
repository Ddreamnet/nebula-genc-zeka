"use client";

import { useEffect, useRef, useState } from "react";
import { History, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { findTool } from "@/lib/playground/tools";
import { ProviderBadge } from "./provider-logos";

export type ChatSummary = {
  id: string;
  toolId: string;
  lastMessageAt: string;
  messageCount: number;
  preview: string;
};

/**
 * Groups the list the way a person actually remembers their own work: not by
 * date, by recency. Anything older than a week collapses into one bucket
 * because "23 Temmuz" tells a student nothing they can act on.
 */
function bucketOf(iso: string): string {
  const then = new Date(iso).getTime();
  const days = (Date.now() - then) / 86_400_000;
  if (days < 1) return "Bugün";
  if (days < 2) return "Dün";
  if (days < 7) return "Bu hafta";
  if (days < 30) return "Bu ay";
  return "Daha eski";
}

const BUCKET_ORDER = ["Bugün", "Dün", "Bu hafta", "Bu ay", "Daha eski"];

/**
 * The Playground's chat history: a floating panel pinned to the left edge,
 * collapsing to a single button and back with one click.
 *
 * Floating rather than a layout column on purpose. The transcript is centred
 * in the viewport and the composer is `fixed` to the bottom across the full
 * width; making the sidebar part of the flow would have meant re-centring both
 * against a width that changes every time the panel opens. As an overlay it
 * costs the transcript nothing, and on a narrow screen it can sit on top of it
 * instead of squeezing it into a column too thin to read.
 *
 * The open/closed transition animates width, opacity and a small slide
 * together. Width is the one property here that can't be composited, but it is
 * also the only one that makes the panel look like it is *folding* rather than
 * sliding out of frame — and it runs once per click, not per frame of scroll,
 * so it is the right trade.
 */
export function ChatHistory({
  activeChatId,
  refreshKey,
  onOpenChat,
  onNewChat,
}: {
  /** Highlights the row for the thread currently on screen. */
  activeChatId: string | null;
  /** Bump to re-fetch — the list changes whenever a turn is written. */
  refreshKey: number;
  onOpenChat: (id: string) => void;
  onNewChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Remember the last state across reloads. Deliberately not defaulted to open:
  // on a phone the panel covers the transcript, and a student who never opens
  // it should never meet it.
  useEffect(() => {
    setOpen(window.localStorage.getItem("pg-history-open") === "1");
  }, []);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    window.localStorage.setItem("pg-history-open", open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    let alive = true;
    fetch("/api/playground/chats")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setChats(Array.isArray(d.chats) ? d.chats : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  async function archive(id: string) {
    setBusyId(id);
    // Optimistic: the row goes immediately, and comes back on the next refresh
    // if the request failed. A soft delete is cheap to be wrong about.
    setChats((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/playground/chats/${id}`, { method: "DELETE" }).catch(() => {});
    setBusyId(null);
    if (id === activeChatId) onNewChat();
  }

  const grouped = BUCKET_ORDER.map((label) => ({
    label,
    items: chats.filter((c) => bucketOf(c.lastMessageAt) === label),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Collapsed handle. Stays mounted under the panel so the two never
          animate against each other — the panel simply covers it when open. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sohbet geçmişini aç"
        aria-expanded={open}
        className={cn(
          "pg-pill fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2 px-2 py-4 text-on-surface-variant transition",
          "hover:text-on-surface md:flex",
          open ? "pointer-events-none opacity-0" : "opacity-100 delay-150",
        )}
      >
        <History className="size-5" />
        <span className="font-mono text-[10px] tracking-widest [writing-mode:vertical-rl]">GEÇMİŞ</span>
      </button>

      <aside
        aria-hidden={!open}
        className={cn(
          "pg-card fixed left-3 top-1/2 z-30 flex max-h-[min(78vh,720px)] -translate-y-1/2 flex-col overflow-hidden",
          "transition-[width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open
            ? "w-[min(292px,86vw)] translate-x-0 opacity-100"
            : "pointer-events-none w-0 -translate-x-4 opacity-0",
        )}
      >
        {/* min-w keeps the contents from reflowing to nothing while the panel
            folds — without it the labels rewrap word by word on the way out. */}
        <div className="flex min-w-[min(292px,86vw)] flex-col overflow-hidden">
          <header className="flex items-center gap-2 border-b-[3px] border-surface-lowest px-3 py-2.5">
            <History className="size-4 shrink-0 text-secondary" />
            <span className="font-mono text-[11px] tracking-widest text-on-surface-variant">GEÇMİŞ</span>
            <button
              type="button"
              onClick={onNewChat}
              title="Yeni sohbet"
              aria-label="Yeni sohbet"
              className="ml-auto inline-flex size-7 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Paneli kapat"
              aria-label="Sohbet geçmişini kapat"
              className="inline-flex size-7 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {loading ? (
              <p className="px-2 py-6 text-center font-mono text-xs text-on-surface-variant">yükleniyor…</p>
            ) : chats.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm leading-relaxed text-on-surface-variant">
                Henüz sohbet yok. Bir şey üret, buraya düşsün.
              </p>
            ) : (
              grouped.map((group) => (
                <section key={group.label} className="mb-2">
                  <h3 className="px-2 pb-1 pt-2 font-mono text-[10px] tracking-widest text-on-surface-variant/70">
                    {group.label.toLocaleUpperCase("tr-TR")}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((c) => {
                      const tool = findTool(c.toolId)?.tool;
                      const active = c.id === activeChatId;
                      return (
                        <li key={c.id} className="group/row relative">
                          <button
                            type="button"
                            onClick={() => onOpenChat(c.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 pr-8 text-left transition",
                              active
                                ? "bg-secondary/15 ring-2 ring-secondary/50"
                                : "hover:bg-surface-high",
                              busyId === c.id && "opacity-40",
                            )}
                          >
                            {tool?.provider ? (
                              <ProviderBadge
                                provider={tool.provider}
                                className="size-7 shrink-0"
                                style={{ border: "2.5px solid var(--pg-ink)" }}
                              />
                            ) : (
                              <span className="size-7 shrink-0 rounded-full bg-surface-high" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] leading-snug text-on-surface">
                                {c.preview || "(boş sohbet)"}
                              </span>
                              <span className="block truncate font-mono text-[10px] text-on-surface-variant">
                                {tool?.name ?? c.toolId} · {c.messageCount} mesaj
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => archive(c.id)}
                            title="Sohbeti sil"
                            aria-label={`Sohbeti sil: ${c.preview || "boş sohbet"}`}
                            className="absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant opacity-0 transition hover:bg-error/20 hover:text-error focus-visible:opacity-100 group-hover/row:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
