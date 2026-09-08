"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Gamepad2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { PanelShell, type PanelNavItem } from "@/components/panel-shell/panel-shell";
import { SideDrawer } from "@/components/panel-shell/side-drawer";
import { useHomeworkNotifications } from "@/lib/homework/use-notifications";
import { activeSlot, longDateLabel, nextSlot, slotLabel, type SlotRef } from "@/lib/lesson/next-lesson";
import { HomeworkNotificationBell } from "./homework-notification-bell";
import { GlobalTopicsManager } from "./global-topics-manager";
import { StudentAboutDialog } from "./student-about-dialog";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";
import { StudentRail, type RailRow } from "./teacher/student-rail";
import { NowStrip } from "./teacher/now-strip";
import { TopicsCard } from "./teacher/topics-card";
import { HomeworkDrawer } from "./teacher/homework-drawer";
import { BalanceDrawer } from "./teacher/balance-drawer";
import type { Student } from "@/lib/admin/types";

/** Bir liste satırı: tek öğrenci ya da bir grup (aynı saatte ders alan 2 kişi). */
interface Row {
  key: string;
  groupId: string | null;
  groupName: string | null;
  members: Student[];
}

/** Kim seçili olursa olsun, satırın "sıradaki ders"i grubun tüm slotlarıdır. */
function rowSlots(row: Row): SlotRef[] {
  return row.members.flatMap((m) => m.lessons);
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
      .join("") || "NG"
  );
}

/** Yan panel yuvası — üçü aynı yeri paylaşır, ikisi aynı anda açılamaz. */
type Drawer = "homework" | "balance" | "schedule" | null;

export function TeacherDashboard({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [groupNameById, setGroupNameById] = useState<Map<string, string>>(new Map());
  const [balanceMinutes, setBalanceMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Yalnızca ANAHTAR state'te tutulur; satırın kendisi `students`'tan
  // türetilir. Row nesnesi tutulsaydı bir refetch'ten sonra detay kolonu
  // refetch'ten ÖNCE alınmış anlık görüntüyü render etmeye devam ederdi.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [about, setAbout] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);

  // Saat panelin bir girdisidir: "şu an derste", kalan dakika ve BUGÜN/BU
  // HAFTA ayrımı bundan türer. 30 saniyede bir tazelenir — dakika göstergesi
  // için yeterli, saniyede bir yeniden render etmek için bir sebep yok.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { notifications, unreadCount, unreadByStudent, markAllAsRead } = useHomeworkNotifications(userId);

  const fetchStudents = useCallback(async () => {
    const supabase = createClient();
    try {
      const [studentsRes, lessonsRes, groupsRes, balanceRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, student_id, is_archived, about_text, group_id, profiles!students_student_id_fkey(full_name, email)")
          .eq("teacher_id", userId)
          .eq("is_archived", false),
        supabase.from("student_lessons").select("id, student_id, day_of_week, start_time, end_time").eq("teacher_id", userId),
        supabase.from("groups").select("id, name").eq("teacher_id", userId),
        supabase.from("teacher_balance").select("total_minutes").eq("teacher_id", userId).maybeSingle(),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (groupsRes.error) throw groupsRes.error;

      const lessonsByStudent = new Map<string, Student["lessons"]>();
      for (const lesson of lessonsRes.data ?? []) {
        const list = lessonsByStudent.get(lesson.student_id) ?? [];
        list.push({ id: lesson.id, dayOfWeek: lesson.day_of_week, startTime: lesson.start_time, endTime: lesson.end_time });
        lessonsByStudent.set(lesson.student_id, list);
      }

      setStudents(
        (studentsRes.data ?? []).map((student) => ({
          ...student,
          about_text: student.about_text ?? null,
          group_id: student.group_id ?? null,
          lessons: lessonsByStudent.get(student.student_id) ?? [],
        })),
      );
      setGroupNameById(new Map((groupsRes.data ?? []).map((g) => [g.id, g.name])));
      setBalanceMinutes(balanceRes.data?.total_minutes ?? 0);
    } catch {
      toast.error("Öğrenciler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /** Gruplar tek satıra katlanır, sonra hepsi SIRADAKİ DERSE göre sıralanır. */
  const rows: Row[] = useMemo(() => {
    const byGroup = new Map<string, Student[]>();
    const solo: Row[] = [];
    for (const student of students) {
      if (student.group_id) {
        const list = byGroup.get(student.group_id) ?? [];
        list.push(student);
        byGroup.set(student.group_id, list);
      } else {
        solo.push({ key: student.id, groupId: null, groupName: null, members: [student] });
      }
    }
    const grouped: Row[] = [...byGroup.entries()].map(([groupId, members]) => ({
      key: groupId,
      groupId,
      groupName: groupNameById.get(groupId) ?? "Grup",
      members,
    }));
    return [...solo, ...grouped].sort((a, b) => {
      const aNext = nextSlot(rowSlots(a), now);
      const bNext = nextSlot(rowSlots(b), now);
      // Ders saati tanımlanmamış satırlar listenin sonunda kalır — orada
      // olmaları bir hata değil, henüz program girilmemiş demek.
      return (aNext?.minutesUntil ?? Number.MAX_SAFE_INTEGER) - (bNext?.minutesUntil ?? Number.MAX_SAFE_INTEGER);
    });
  }, [students, groupNameById, now]);

  const railRows: RailRow[] = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return rows
      .map((row) => {
        const slots = rowSlots(row);
        const live = activeSlot(slots, now);
        const next = nextSlot(slots, now);
        const name = row.groupName ?? row.members[0].profiles.full_name;
        const unread = row.members.reduce((sum, m) => sum + (unreadByStudent.get(m.student_id) ?? 0), 0);
        return {
          key: row.key,
          name,
          when: live ? "ŞİMDİ" : next ? slotLabel(next.slot, now) : "—",
          // "Bugün": bir sonraki başlangıç bugünün içinde kalıyor. Gün
          // numarasını karşılaştırmak yetmez — Salı 18:00'de bakan biri için
          // "Salı 09:00" gelecek haftadır.
          isToday: !!live || (!!next && next.minutesUntil < minutesUntilEndOfDay(now)),
          isActive: !!live,
          unread,
        } satisfies RailRow;
      })
      .filter((row) => !needle || row.name.toLocaleLowerCase("tr-TR").includes(needle));
  }, [rows, now, query, unreadByStudent]);

  // Seçili satır kaybolursa (arşivlendi, gruptan çıktı) `find` zaten null
  // döner ve panel boş yuvaya iner — anahtarı ayrıca temizleyen bir effect
  // gereksizdi: görünür hiçbir şeyi değiştirmiyor, sadece fazladan bir
  // render turu açıyordu.
  const selected = rows.find((row) => row.key === selectedKey) ?? null;

  const nav: PanelNavItem[] = [
    { key: "students", label: "Öğrenciler", icon: Users, tone: "blue", active: drawer === null, onClick: () => setDrawer(null) },
    {
      key: "schedule",
      label: "Haftalık program",
      icon: Calendar,
      tone: "mint",
      active: drawer === "schedule",
      onClick: () => setDrawer(drawer === "schedule" ? null : "schedule"),
    },
    {
      key: "balance",
      label: "Bakiye",
      icon: Wallet,
      tone: "peach",
      active: drawer === "balance",
      onClick: () => setDrawer(drawer === "balance" ? null : "balance"),
    },
    { key: "playground", label: "Playground", icon: Gamepad2, tone: "violet", href: "/playground" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
      </div>
    );
  }

  const teacherName = profile?.full_name ?? "";
  const lessonsToday = rows.filter((row) => {
    const next = nextSlot(rowSlots(row), now);
    return !!activeSlot(rowSlots(row), now) || (!!next && next.minutesUntil < minutesUntilEndOfDay(now));
  }).length;

  return (
    <PanelShell
      greeting={`İyi dersler${teacherName ? `, ${teacherName.split(" ")[0]}` : ""}`}
      subline={`${longDateLabel(now)} · BUGÜN ${lessonsToday} DERS`}
      nav={nav}
      initials={initialsOf(teacherName)}
      unreadCount={unreadCount}
      onSignOut={() => {
        setSigningOut(true);
        signOut();
      }}
      signingOut={signingOut}
      chip={
        balanceMinutes !== null ? (
          <span className="pn-bar-btn pn-bar-btn--num" title="İşlenen toplam ders süresi">
            {balanceMinutes}
            <span className="text-[10px] font-normal tracking-wide text-[color:var(--pn-on-navy-dim)]">DK</span>
          </span>
        ) : null
      }
      bell={
        <HomeworkNotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
          variant="bar"
          onNotificationClick={(studentId) => {
            const row = rows.find((r) => r.members.some((m) => m.student_id === studentId));
            if (!row) return;
            setSelectedKey(row.key);
            setDrawer("homework");
          }}
        />
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3 md:grid-cols-[210px_1fr] lg:items-stretch lg:gap-4">
        <StudentRail
          rows={railRows}
          total={rows.length}
          selectedKey={selectedKey}
          onSelect={(key) => setSelectedKey(key)}
          query={query}
          onQueryChange={setQuery}
        />

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          {selected && (
            <NowStrip
              studentId={selected.members[0].student_id}
              studentName={selected.groupName ?? selected.members[0].profiles.full_name}
              teacherId={userId}
              slots={rowSlots(selected)}
              now={now}
              homeworkOpen={drawer === "homework"}
              onToggleHomework={() => setDrawer(drawer === "homework" ? null : "homework")}
              onOpenAbout={() =>
                setAbout({
                  studentId: selected.members[0].student_id,
                  studentName: selected.members[0].profiles.full_name,
                  aboutText: selected.members[0].about_text,
                })
              }
            />
          )}

          {/* Konular kartı ve yan panel AYNI flex satırının iki çocuğu:
              yükseklikleri bu yüzden yapısal olarak eşit ve panel kartı
              gerçekten sıkıştırıyor. Panel bir overlay olsaydı "aynı
              yükseklik" şartı ilk içerik değişiminde kaybolurdu.
              Üç panel de (ödevler, bakiye, program) AYNI yuvayı paylaşır;
              ikisi aynı anda açılamaz, çünkü `drawer` tek bir değerdir. */}
          <div className="flex min-h-0 flex-1 items-stretch gap-3">
            {drawer !== "schedule" &&
              (selected ? (
                <TopicsCard
                  members={selected.members}
                  groupName={selected.groupName ?? undefined}
                  onOpenLibrary={() => setShowLibrary(true)}
                />
              ) : (
                // Dolu bir kart değil, bilinçli olarak BOŞ bir yuva: kesikli
                // çerçeve "seçim bekliyor" der, "yüklenemedi" demez.
                <div className="flex min-h-[112px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[16px] border-[1.5px] border-dashed border-[color:rgba(36,55,166,.32)] px-6 py-5 text-center lg:min-h-[220px]">
                  <p className="font-display text-[15px] font-semibold text-[color:var(--pn-blue-ink)]">Bir öğrenci seç</p>
                  <p className="max-w-[240px] text-[12px] text-on-surface-variant">Dersleri ve konuları burada görünür.</p>
                </div>
              ))}

            {selected && (
              <HomeworkDrawer
                open={drawer === "homework"}
                onClose={() => setDrawer(null)}
                members={selected.members}
                teacherId={userId}
              />
            )}

            <BalanceDrawer open={drawer === "balance"} onClose={() => setDrawer(null)} teacherId={userId} />

            {/* Program tam genişlik ister: haftalık ızgara 376px'e sığmaz.
                `wide` konular kartının yerine geçmesini sağlar. */}
            {drawer === "schedule" && (
              <SideDrawer
                open
                wide
                onClose={() => setDrawer(null)}
                tone="mint"
                title="Haftalık program"
                subtitle="Dersleri buradan işaretleyebilirsin"
              >
                {/* Izgara kendi kutusunda yatay kayar. Sayfanın gövdesi
                    asla yatay kaymaz — mobilde bu, dokunmanın hangi ekseni
                    sürüklediğini belirsiz bırakan tek hatadır. */}
                <div className="min-w-0 overflow-x-auto">
                  <WeeklyScheduleGrid teacherId={userId} />
                </div>
              </SideDrawer>
            )}
          </div>
        </div>
      </div>

      <GlobalTopicsManager open={showLibrary} onOpenChange={setShowLibrary} isAdmin={false} />

      {about && (
        <StudentAboutDialog
          key={about.studentId}
          open
          onOpenChange={(open) => !open && setAbout(null)}
          studentId={about.studentId}
          studentName={about.studentName}
          aboutText={about.aboutText}
          isReadOnly={false}
          onSaved={async () => {
            await fetchStudents();
            setAbout(null);
          }}
        />
      )}
    </PanelShell>
  );
}

/** Günün sonuna kalan dakika — "bugün mü" sorusunun tek eşiği. */
function minutesUntilEndOfDay(now: Date): number {
  return (24 - now.getHours()) * 60 - now.getMinutes();
}
