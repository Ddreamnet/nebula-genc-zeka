"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Hammer, Phone, Upload, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { PanelShell, type PanelNavItem } from "@/components/panel-shell/panel-shell";
import { SideDrawer } from "@/components/panel-shell/side-drawer";
import { useStudentTopics } from "@/lib/lesson/use-student-topics";
import { useHomeworkNotifications } from "@/lib/homework/use-notifications";
import { useHomeworkBatches } from "@/lib/homework/use-homework-batches";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { activeSlot, longDateLabel } from "@/lib/lesson/next-lesson";
import { HomeworkNotificationBell } from "./homework-notification-bell";
import { ContactDialog } from "./contact-dialog";
import { UploadHomeworkDialog } from "./upload-homework-dialog";
import { HomeworkBatchList, FilePreviewOverlay } from "./homework/homework-batches";
import { ProgressRail } from "./student/progress-rail";
import { StudentTopicsCard } from "./student/topics-card";

interface TodayLesson {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
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

export function StudentDashboard({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();

  // `null` sürüm satırı gelene kadar, "" DEĞİL — boş bir dize yükleme
  // diyaloğunun uuid olarak seve seve insert edip 22P02 aldığı bir değerdir.
  // Ödev düğmeleri null olduğu sürece kapalı kalır.
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [todayLessons, setTodayLessons] = useState<TodayLesson[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [drawer, setDrawer] = useState<"homework" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { allTopics: topics, loading, refetch: refetchTopics } = useStudentTopics(userId);
  const { notifications, unreadCount, markAllAsRead } = useHomeworkNotifications(userId, true);
  const homework = useHomeworkBatches(userId, teacherId ?? "", drawer === "homework" && !!teacherId);

  useEffect(() => {
    refetchTopics();

    const supabase = createClient();

    // Bugünün slotları. `day_of_week` JS'in getDay()'i gibi 0=Pazar olarak
    // saklanır, dönüşüm gerekmez.
    supabase
      .from("student_lessons")
      .select("id, day_of_week, start_time, end_time, meeting_url")
      .eq("student_id", userId)
      .eq("day_of_week", new Date().getDay())
      .order("start_time")
      .then(({ data }) => {
        setTodayLessons(
          (data ?? []).map((l) => ({
            id: l.id,
            dayOfWeek: l.day_of_week,
            startTime: l.start_time,
            endTime: l.end_time,
            meetingUrl: l.meeting_url,
          })),
        );
      });

    supabase
      .from("students")
      .select("teacher_id, created_at")
      .eq("student_id", userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTeacherId(data.teacher_id);
        // `students` satırının oluşturulmasından bu yana geçen hafta —
        // "Tüm Dersleri Sıfırla" bu çapaya dokunmaz (rpc_reset_package
        // yalnızca student_lesson_tracking/lesson_instances'ı değiştirir),
        // yani sayaç paket sıfırlamalarında geriye zıplamak yerine artmaya
        // devam eder.
        const weeks = Math.floor((Date.now() - new Date(data.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        setWeekNumber(Number.isFinite(weeks) ? weeks : null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const visibleTopics = useMemo(
    () =>
      [...topics.filter((t) => t.is_completed), ...topics.filter((t) => !t.is_completed && t.resources.some((r) => r.is_completed))].sort(
        (a, b) => a.order_index - b.order_index,
      ),
    [topics],
  );

  const live = activeSlot(todayLessons, now);

  const nav: PanelNavItem[] = [
    { key: "topics", label: "Konularım", icon: BookOpen, tone: "blue", active: drawer === null, onClick: () => setDrawer(null) },
    {
      key: "homework",
      label: "Ödevlerim",
      icon: FileText,
      tone: "peach",
      active: drawer === "homework",
      onClick: () => setDrawer(drawer === "homework" ? null : "homework"),
    },
    { key: "contact", label: "İletişim", icon: Phone, tone: "pink", onClick: () => setContactOpen(true) },
    { key: "playground", label: "Üretim Atölyesi", icon: Hammer, tone: "violet", href: "/playground" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
      </div>
    );
  }

  const studentName = profile?.full_name ?? "";

  return (
    <PanelShell
      greeting={`Merhaba${studentName ? `, ${studentName.split(" ")[0]}` : ""}`}
      subline={`${longDateLabel(now)}${todayLessons.length > 0 ? ` · BUGÜN ${todayLessons.length} DERS` : ""}`}
      nav={nav}
      initials={initialsOf(studentName)}
      unreadCount={unreadCount}
      onSignOut={() => {
        setSigningOut(true);
        signOut();
      }}
      signingOut={signingOut}
      // Barda hafta sayacı YOK. "3 HAFTA" ile "3. hafta" farklı iki şeydir ve
      // mono bir çip içinde birincisi okunuyordu. Sayı zaten İlerlemem
      // kartının bandında, ait olduğu bağlamın içinde duruyor.
      bell={
        <HomeworkNotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
          isStudent
          variant="bar"
          onNotificationClick={() => teacherId && setDrawer("homework")}
        />
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3 md:grid-cols-[210px_1fr] lg:items-stretch lg:gap-4">
        <ProgressRail studentId={userId} weekNumber={weekNumber} />

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          {/* Ders gününde bu sayfayı açmanın TEK sebebi derse girmek — o
              yüzden en üstte ve tek bir düğme. Slotu olmayan günlerde şerit
              hiç çizilmez; boş bir "bugün ders yok" kutusu yer kaplamaktan
              başka bir şey yapmazdı. */}
          {todayLessons.length > 0 && (
            <section
              className="flex flex-wrap items-center gap-2.5 rounded-[16px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue)] p-[13px]"
              style={{ boxShadow: "0 1px 2px rgba(36,55,166,.06), 0 8px 20px -12px rgba(36,55,166,.24)" }}
            >
              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[18px] font-semibold leading-tight text-on-surface">Bugün dersin var</h2>
                  {live && (
                    <span className="pn-tag pn-tag--mint">
                      <span aria-hidden className="pn-pulse size-1.5 rounded-full bg-[color:var(--pn-mint-ink)]" />
                      Derste · {live.minutesLeft} dk
                    </span>
                  )}
                </div>
                {/* Günün bütün saatleri TEK satırda. Arka arkaya iki 40 dakikalık
                    ders (40+40) iki ayrı "Bugün dersin var" kartı üretiyordu —
                    aynı başlık iki kez, iki kat yer. Canlı olan saat koyu
                    yazılır; ayrı bir kart değil. */}
                <p className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--pn-blue-ink-strong)]">
                  <span>{getDayName(todayLessons[0].dayOfWeek)}</span>
                  {todayLessons.map((lesson) => (
                    <span key={lesson.id} className={live?.slot.id === lesson.id ? "text-[color:var(--pn-mint-ink)]" : undefined}>
                      {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
                    </span>
                  ))}
                </p>
              </div>
              {(() => {
                // Bir düğme: canlı dersin bağlantısı, yoksa günün ilk bağlantısı.
                const url = (live && todayLessons.find((l) => l.id === live.slot.id)?.meetingUrl) ?? todayLessons.find((l) => l.meetingUrl)?.meetingUrl ?? null;
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn--mint w-full sm:w-auto">
                    <Video className="size-4" strokeWidth={1.9} aria-hidden />
                    Derse katıl
                  </a>
                ) : (
                  <p className="text-[12px] text-[color:var(--pn-blue-ink-strong)]">Ders linki henüz eklenmedi.</p>
                );
              })()}
            </section>
          )}

          <div className="flex min-h-0 flex-1 items-stretch gap-3">
            <StudentTopicsCard topics={visibleTopics} loading={loading} />

            <SideDrawer
              open={drawer === "homework"}
              onClose={() => setDrawer(null)}
              tone="peach"
              title="Ödevlerim"
              subtitle={`${homework.batches.length} ödev`}
              footer={
                <button
                  type="button"
                  className="pn-btn pn-btn--peach w-full"
                  disabled={!teacherId}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" strokeWidth={1.9} aria-hidden />
                  Ödev yükle
                </button>
              }
            >
              <HomeworkBatchList
                batches={homework.batches}
                loading={homework.loading}
                currentUserId={userId}
                onPreview={homework.openPreview}
                onDownload={homework.download}
                onDelete={homework.remove}
                emptyText="Henüz ödev yok."
              />
            </SideDrawer>
          </div>
        </div>
      </div>

      <FilePreviewOverlay preview={homework.preview} onClose={homework.closePreview} />

      <UploadHomeworkDialog
        open={uploadOpen}
        onOpenChange={(value) => {
          setUploadOpen(value);
          if (!value) homework.refetch();
        }}
        studentId={userId}
        teacherId={teacherId ?? ""}
        uploadedByUserId={userId}
      />

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </PanelShell>
  );
}
