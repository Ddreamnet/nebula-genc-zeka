"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Phone, Sparkles, Upload, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { PanelShell, type PanelNavItem } from "@/components/panel-shell/panel-shell";
import { SideDrawer } from "@/components/panel-shell/side-drawer";
import { useStudentTopics } from "@/lib/lesson/use-student-topics";
import { useHomeworkNotifications } from "@/lib/homework/use-notifications";
import { useHomeworkBatches } from "@/lib/homework/use-homework-batches";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { activeSlot, longDateLabel, nextSlot } from "@/lib/lesson/next-lesson";
import { HomeworkNotificationBell } from "./homework-notification-bell";
import { ContactDialog } from "./contact-dialog";
import { UploadHomeworkDialog } from "./upload-homework-dialog";
import { HomeworkBatchList, FilePreviewOverlay } from "./homework/homework-batches";
import { PackageGrid } from "./package-grid";
import { SelectedCard, cardPeachButton } from "./selected-card";
import { StudentTopicsCard } from "./student/topics-card";

interface TodayLesson {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
}

export function StudentDashboard({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();

  // `null` sürüm satırı gelene kadar, "" DEĞİL — boş bir dize yükleme
  // diyaloğunun uuid olarak seve seve insert edip 22P02 aldığı bir değerdir.
  // Ödev düğmeleri null olduğu sürece kapalı kalır.
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [lessons, setLessons] = useState<TodayLesson[]>([]);
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

    // Haftanın bütün slotları: "sıradaki ders" bugünden sonrasını da bilmeli.
    // `day_of_week` JS'in getDay()'i gibi 0=Pazar olarak saklanır.
    supabase
      .from("student_lessons")
      .select("id, day_of_week, start_time, end_time, meeting_url")
      .eq("student_id", userId)
      .order("start_time")
      .then(({ data }) => {
        setLessons(
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

  const todayLessons = lessons.filter((l) => l.dayOfWeek === now.getDay());
  const live = activeSlot(todayLessons, now);
  const upcoming = nextSlot(lessons, now);

  const nav: PanelNavItem[] = [
    {
      key: "homework",
      label: "Ödevler",
      title: "Ödevlerim",
      icon: FileText,
      tone: "peach",
      active: drawer === "homework",
      onClick: () => setDrawer(drawer === "homework" ? null : "homework"),
    },
    { key: "playground", label: "Atölye", title: "Üretim Atölyesi", icon: Sparkles, tone: "violet", href: "/playground" },
    { key: "contact", label: "İletişim", icon: Phone, tone: "blue", mobile: "menu", onClick: () => setContactOpen(true) },
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
      greeting="Öğrenci paneli"
      subline={`${longDateLabel(now)}${todayLessons.length > 0 ? ` · BUGÜN ${todayLessons.length} DERS` : ""}`}
      nav={nav}
      onSignOut={() => {
        setSigningOut(true);
        signOut();
      }}
      signingOut={signingOut}
      // Barda hafta sayacı YOK: "3. hafta" paket kartının künyesinde, ait
      // olduğu bağlamın içinde duruyor.
      bell={
        <HomeworkNotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
          isStudent
          onNotificationClick={() => teacherId && setDrawer("homework")}
        />
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {(() => {
          // Ders gününde bu sayfayı açmanın tek sebebi derse girmek: bağlantı
          // kartın sağında, Ödevler'in yanında. Canlı dersin bağlantısı,
          // yoksa günün ilk bağlantısı; ders günü değilse düğme yok.
          const joinUrl =
            (live && todayLessons.find((l) => l.id === live.slot.id)?.meetingUrl) ??
            todayLessons.find((l) => l.meetingUrl)?.meetingUrl ??
            null;
          const next = live?.slot ?? upcoming?.slot ?? null;
          return (
            <SelectedCard
              ariaLabel="Paketim"
              title={`Merhaba${studentName ? `, ${studentName.split(" ")[0]}` : ""}`}
              meta={
                <>
                  <span>
                    {next
                      ? `${live ? "Şu an" : "Sıradaki ders"}: ${getDayName(next.dayOfWeek)} ${formatTime(next.startTime)}`
                      : "Ders saatin henüz eklenmedi"}
                  </span>
                  {live && (
                    <span className="pn-tag pn-tag--peach">
                      <span aria-hidden className="pn-pulse size-1.5 rounded-full bg-[color:var(--pn-peach-ink)]" />
                      Derste · {live.minutesLeft} dk
                    </span>
                  )}
                  {weekNumber !== null && <span className="pn-tag pn-tag--cream">{weekNumber}. hafta</span>}
                </>
              }
              grid={
                teacherId ? (
                  <PackageGrid studentId={userId} teacherId={teacherId} studentName={studentName} now={now} realtime />
                ) : undefined
              }
              actions={
                <>
                  {joinUrl && (
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className={`${cardPeachButton} !border-[color:rgba(23,145,91,.4)] !bg-[color:var(--pn-mint)] !text-[color:var(--pn-mint-ink-strong)]`}>
                      <Video className="size-[18px]" strokeWidth={1.9} aria-hidden />
                      Derse katıl
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setDrawer(drawer === "homework" ? null : "homework")}
                    aria-pressed={drawer === "homework"}
                    // Dar kartta iki düğme adı ve saati ezer; derse katılma
                    // günü Ödevler düğmesi çekilir — bardaki ÖDEVLER döşemesi
                    // aynı paneli açar.
                    className={`${cardPeachButton} ${joinUrl ? "@max-[860px]:hidden" : ""}`}
                  >
                    <FileText className="size-[18px]" strokeWidth={1.9} aria-hidden />
                    Ödevler
                  </button>
                </>
              }
            />
          );
        })()}

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
