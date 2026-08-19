"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/panel-ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/panel-ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { ScrollArea } from "@/components/panel-ui/scroll-area";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Notification {
  id: string;
  teacher_id: string;
  student_id: string;
  homework_id: string;
  is_read: boolean;
  created_at: string;
  full_name?: string;
}

interface HomeworkNotificationBellProps {
  userId: string;
  isStudent?: boolean;
  onNotificationClick?: (studentId: string) => void;
}

export function HomeworkNotificationBell({ userId, isStudent = false, onNotificationClick }: HomeworkNotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(20);
    if (error) return;

    const otherIds = [...new Set((data ?? []).map((n) => (isStudent ? n.teacher_id : n.student_id)))];
    const profiles = otherIds.length > 0 ? (await supabase.from("profiles").select("user_id, full_name").in("user_id", otherIds)).data : [];
    const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

    const enriched = (data ?? []).map((n) => ({
      ...n,
      full_name: nameMap.get(isStudent ? n.teacher_id : n.student_id) ?? (isStudent ? "Öğretmen" : "Öğrenci"),
    }));

    setNotifications(enriched);
    setUnreadCount(enriched.filter((n) => !n.is_read).length);
  }, [userId, isStudent]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
        fetchNotifications();
        toast.info(isStudent ? "Öğretmeniniz yeni bir dosya yükledi" : "Bir öğrenciniz yeni ödev yükledi");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isStudent, fetchNotifications]);

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
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

  function handleNotificationClick(notification: Notification) {
    setOpen(false);
    onNotificationClick?.(notification.student_id);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="pn-btn pn-btn--icon pn-btn--purple relative" aria-label="Bildirimler">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">{unreadCount > 9 ? "9+" : unreadCount}</Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] p-0" align="end">
        <Card>
          <CardHeader className="border-b-[2.5px] border-primary bg-surface-dim pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Bildirimler</CardTitle>
                <CardDescription className="mt-1">{unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}</CardDescription>
              </div>
              {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Henüz bildirim yok</p>
                  <p className="text-xs text-muted-foreground mt-1">Yeni ödev yüklendiğinde burada görünecek</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors hover:bg-accent/50 cursor-pointer ${!notification.is_read ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-2 ${!notification.is_read ? "bg-primary/10" : "bg-muted"}`}>
                          <FileText className={`h-4 w-4 ${!notification.is_read ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.is_read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>{notification.full_name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{isStudent ? "Yeni bir dosya yükledi" : "Yeni bir ödev yükledi"}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{format(new Date(notification.created_at), "dd MMM yyyy, HH:mm", { locale: tr })}</p>
                          </div>
                        </div>
                        {!notification.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-2" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
