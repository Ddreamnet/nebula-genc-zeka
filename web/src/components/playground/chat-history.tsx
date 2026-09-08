"use client";

import { useEffect, useRef } from "react";
import { SHEET_CLOSED_TRANSFORM, useDragToDismiss } from "@/components/panel-ui/sheet";
import { History, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { findTool } from "@/lib/playground/tools";
import type { ChatSummary } from "@/lib/playground/chats";
import { ToolAvatar } from "./transcript";

export type { ChatSummary };

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
 * The Playground's chat history panel.
 *
 * Presentational: the list lives in the Playground (seeded by the server
 * render, re-read after every turn), so this only draws it. It FLOATS over
 * the workspace at every size (`.pg-panel` in globals.css) — opening it must
 * never re-flow the transcript behind it.
 */
export function ChatHistory({
  open,
  chats,
  activeChatId,
  busy,
  busyId,
  onOpenChat,
  onNewChat,
  onArchive,
  onClose,
}: {
  open: boolean;
  chats: ChatSummary[];
  /** Highlights the row for the thread currently on screen. */
  activeChatId: string | null;
  /** A generation is in flight; switching threads now would misplace its reply. */
  busy: boolean;
  /** A row whose archive request is in flight. */
  busyId: string | null;
  onOpenChat: (id: string) => void;
  onNewChat: () => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const drag = useDragToDismiss(panelRef, onClose, { closedTransform: SHEET_CLOSED_TRANSFORM });

  const grouped = BUCKET_ORDER.map((label) => ({
    label,
    items: chats.filter((c) => bucketOf(c.lastMessageAt) === label),
  })).filter((g) => g.items.length > 0);

  // Escape closes it — the panel floats over the workspace, so it needs the
  // same way out every overlay in the product has.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // `inert` while closed: the panel is invisible but still in the DOM, and
  // without it Tab would walk into buttons nobody can see.
  return (
    <aside ref={panelRef} className="pg-panel pg-panel--left" data-open={open} aria-hidden={!open} inert={!open} aria-label="Sohbet geçmişi">
      <header className="pg-panel-head pg-panel-head--navy pg-panel-handle" {...drag}>
        <History className="size-4 shrink-0 text-[color:var(--pn-peach)]" strokeWidth={1.9} aria-hidden />
        <span className="pg-panel-label">Geçmiş</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onNewChat}
          disabled={busy}
          title={busy ? "Üretim bitince yeni sohbet açabilirsin" : "Yeni sohbet"}
          aria-label="Yeni sohbet"
          className="pn-bar-btn"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <button type="button" onClick={onClose} title="Paneli kapat" aria-label="Sohbet geçmişini kapat" className="pn-bar-btn">
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="pg-scroll min-h-0 flex-1 p-2.5">
        {chats.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] leading-relaxed text-on-surface-variant">
            Henüz sohbet yok. Bir şey üret, buraya düşsün.
          </p>
        ) : (
          grouped.map((group) => (
            <section key={group.label} className="mb-1.5">
              <p className="pn-divider" style={{ ["--pn-divider-ink" as string]: "var(--pn-blue-ink)" }}>
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((c) => {
                  const tool = findTool(c.toolId)?.tool;
                  const active = c.id === activeChatId;
                  return (
                    <li key={c.id} className="group/row relative">
                      <button
                        type="button"
                        onClick={() => onOpenChat(c.id)}
                        disabled={busy && !active}
                        aria-current={active ? "true" : undefined}
                        title={busy && !active ? "Üretim bitince başka sohbete geçebilirsin" : c.preview}
                        className={cn("pn-row pr-9", busyId === c.id && "opacity-40", "disabled:pointer-events-none disabled:opacity-40")}
                        style={{
                          ["--pn-row-stripe" as string]: active ? "var(--pn-blue-ink)" : "transparent",
                          ["--pn-row-fill" as string]: active ? "var(--pn-blue-sel)" : "transparent",
                          ["--pn-row-hover" as string]: "var(--pn-blue-tint)",
                        }}
                      >
                        {tool ? (
                          <ToolAvatar tool={tool} className="size-8" iconClassName="size-4" />
                        ) : (
                          <span className="size-8 shrink-0 rounded-full bg-surface-low" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold leading-tight text-on-surface">
                            {c.preview || "(boş sohbet)"}
                          </span>
                          <span className="block truncate font-mono text-[10px] leading-tight text-on-surface-variant">
                            {tool?.name ?? c.toolId} · {c.messageCount} mesaj
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchive(c.id)}
                        // Archiving the open thread resets it to a new chat,
                        // which is refused mid-generation — so the row would
                        // vanish while its reply kept filling the stage.
                        disabled={busy && active}
                        title="Sohbeti sil"
                        aria-label={`Sohbeti sil: ${c.preview || "boş sohbet"}`}
                        className={cn(
                          "absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[8px] text-outline opacity-0 transition-[opacity,background-color,color] duration-[.16s]",
                          busy && active
                            ? "pointer-events-none"
                            : "hover:bg-[color:var(--pn-pink)] hover:text-[color:var(--pn-pink-ink-strong)] focus-visible:opacity-100 group-hover/row:opacity-100",
                        )}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.9} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
