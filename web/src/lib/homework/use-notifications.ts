"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface HomeworkNotification {
  id: string;
  teacher_id: string;
  student_id: string;
  homework_id: string;
  is_read: boolean;
  created_at: string;
  /** Karşı tarafın adı: öğretmende öğrencinin, öğrencide öğretmenin adı. */
  full_name: string;
}

/**
 * Ödev bildirimleri — TEK kaynak.
 *
 * Aynı sayı iki yerde görünüyor: bardaki zil rozeti ve öğrenci listesindeki
 * satır sayacı. İki ayrı sorgu yapılsaydı ikisi kaçınılmaz olarak birbirinden
 * ayrı düşerdi (biri realtime ile tazelenir, diğeri tazelenmez). Bu yüzden
 * sorgu bir kez burada yapılır ve iki görünüm aynı diziden türetilir.
 *
 * `unreadByStudent` bir teslim durumu DEĞİL: yalnızca "bu öğrenci yeni dosya
 * yükledi, henüz bakmadın" der — bildirim tablosunun gerçekten söylediği şey
 * budur.
 */
export function useHomeworkNotifications(userId: string, isStudent = false) {
  const [notifications, setNotifications] = useState<HomeworkNotification[]>([]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, homework_id, student_id, teacher_id, is_read, created_at, recipient_id")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return;

    const otherIds = [...new Set((data ?? []).map((n) => (isStudent ? n.teacher_id : n.student_id)))];
    const profiles =
      otherIds.length > 0 ? (await supabase.from("profiles").select("user_id, full_name").in("user_id", otherIds)).data : [];
    const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

    setNotifications(
      (data ?? []).map((n) => ({
        ...n,
        full_name: nameById.get(isStudent ? n.teacher_id : n.student_id) ?? (isStudent ? "Öğretmen" : "Öğrenci"),
      })),
    );
  }, [userId, isStudent]);

  useEffect(() => {
    if (!userId) return;
    refetch();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => {
          refetch();
          toast.info(isStudent ? "Öğretmeniniz yeni bir dosya yükledi" : "Bir öğrenciniz yeni ödev yükledi");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isStudent, refetch]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const unreadByStudent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notifications) {
      if (n.is_read) continue;
      counts.set(n.student_id, (counts.get(n.student_id) ?? 0) + 1);
    }
    return counts;
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    // İyimser güncelleme: rozet beklemeden söner. Yazma başarısız olursa
    // sunucudan gelen gerçek durum geri yüklenir.
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (error) {
      toast.error("Bildirimler okundu olarak işaretlenemedi");
      refetch();
    }
  }, [notifications, refetch]);

  return { notifications, unreadCount, unreadByStudent, markAllAsRead, refetch };
}
