"use client";

import { useState } from "react";
import { Bell, FileText } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import type { HomeworkNotification } from "@/lib/homework/use-notifications";
import { cn } from "@/lib/cn";

interface Props {
  notifications: HomeworkNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  isStudent?: boolean;
  onNotificationClick?: (studentId: string) => void;
  /** Lacivert barın üstünde mi, krem bir yüzeyde mi duruyor. */
  variant?: "bar" | "surface";
}

/**
 * Bildirim zili — panelin TEK bildirim göstergesi.
 *
 * Veriyi kendisi çekmez: aynı sayı öğrenci listesindeki satır sayacında da
 * görünüyor ve iki ayrı sorgu kaçınılmaz olarak birbirinden ayrı düşerdi.
 * Sayı yukarıdan gelir (bkz. use-notifications).
 *
 * Açılınca hepsi okundu sayılır — kapatınca değil: kullanıcı listeyi
 * gördüğü anda okumuştur, ve "kapat" ile "okudum" farklı iki niyettir.
 */
export function HomeworkNotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  isStudent = false,
  onNotificationClick,
  variant = "surface",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && unreadCount > 0) onMarkAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Bildirimler — ${unreadCount} okunmamış` : "Bildirimler"}
          title="Bildirimler"
          className={cn(
            "relative",
            // Barda: barın diğer kontrolleriyle AYNI kutu. Eskiden pembe
            // dolgulu bir kareydi ve yanındaki üç kontrolün hiçbirine
            // benzemiyordu. Krem bir yüzeyde ise normal ikon butonu.
            variant === "bar" ? "pn-bar-btn" : "pn-btn pn-btn--icon pn-btn--pink",
          )}
        >
          <Bell className="size-4" strokeWidth={1.9} aria-hidden />
          {unreadCount > 0 && (
            <span className={cn("pn-badge", variant === "surface" && "border-[color:var(--color-surface)]")}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="pn-band pn-band--pink justify-between">
          <h3 className="pn-card-title">Bildirimler</h3>
          <span className="pn-chip pn-chip--pink">{unreadCount}</span>
        </div>

        <div className="pn-scroll max-h-[min(60vh,420px)] p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-7 text-outline" strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] text-on-surface-variant">Henüz bildirim yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNotificationClick?.(notification.student_id);
                  }}
                  className="pn-row items-start gap-2.5 p-2"
                  style={{
                    ["--pn-row-stripe" as string]: notification.is_read ? "transparent" : "var(--pn-pink-ink)",
                    ["--pn-row-fill" as string]: notification.is_read ? "transparent" : "var(--pn-pink-sel)",
                    ["--pn-row-hover" as string]: "var(--pn-pink-tint)",
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] bg-[color:var(--pn-pink)] text-[color:var(--pn-pink-ink-strong)]"
                  >
                    <FileText className="size-3.5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-on-surface">{notification.full_name}</span>
                    <span className="block text-[12px] text-on-surface-variant">
                      {isStudent ? "yeni bir dosya yükledi" : "yeni bir ödev yükledi"}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-on-surface-variant">
                      {format(new Date(notification.created_at), "dd MMM · HH:mm", { locale: tr })}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
