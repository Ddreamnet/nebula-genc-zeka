"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/cn";

interface AdminNotification {
  id: string;
  notification_type: string;
  teacher_id: string;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Lacivert barın üstünde mi, krem bir yüzeyde mi duruyor. */
export function NotificationBell({ variant = "surface" }: { variant?: "bar" | "surface" } = {}) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id, notification_type, teacher_id, student_id, message, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return;
    setNotifications(data ?? []);
    setUnreadCount((data ?? []).filter((n) => !n.is_read).length);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, (payload) => {
        fetchNotifications();
        toast.info((payload.new as AdminNotification).message);
      })
      .subscribe();

    function handleVisibility() {
      if (document.visibilityState === "visible") fetchNotifications();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNotifications]);

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const supabase = createClient();
    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", unreadIds);
    if (error) {
      toast.error("Bildirimler okundu olarak işaretlenemedi");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen && unreadCount > 0) markAllAsRead();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Bildirimler — ${unreadCount} okunmamış` : "Bildirimler"}
          title="Bildirimler"
          className={cn("relative", variant === "bar" ? "pn-bar-btn" : "pn-btn pn-btn--icon pn-btn--pink")}
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
        <div className="pn-band pn-band--violet justify-between">
          <h3 className="pn-card-title">Admin bildirimleri</h3>
          <span className="pn-chip pn-chip--violet">{unreadCount}</span>
        </div>

        <div className="pn-scroll max-h-[min(60vh,420px)] p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-7 text-outline" strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] text-on-surface-variant">Henüz bildirim yok.</p>
              <p className="text-[12px] text-on-surface-variant">Öğrencilerin son dersleri yaklaştığında burada görünür.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="pn-row cursor-default items-start gap-2.5 p-2"
                  style={{
                    ["--pn-row-stripe" as string]: notification.is_read ? "transparent" : "var(--pn-violet-ink)",
                    ["--pn-row-fill" as string]: notification.is_read ? "transparent" : "var(--pn-violet-sel)",
                    ["--pn-row-hover" as string]: "transparent",
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] bg-[color:var(--pn-violet)] text-[color:var(--pn-violet-ink-strong)]"
                  >
                    <Users className="size-3.5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug text-on-surface">{notification.message}</span>
                    <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-on-surface-variant">
                      {format(new Date(notification.created_at), "dd MMM · HH:mm", { locale: tr })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
