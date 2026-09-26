"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { addDays, format, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmSheet } from "@/components/panel-ui/sheet";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/lesson/format";
import { completeTrialLesson, undoTrialLesson, completeLesson, undoCompleteLesson } from "@/lib/lesson/service";
import { translateLessonError } from "@/lib/lesson/errors";
import { useAsyncAction } from "@/lib/use-async-action";
import { clearWeekCache, fetchActualLessonsForWeek, getWeekStartForOffset, prefetchWeek, type ActualLesson } from "@/lib/lesson/week-cache";

/**
 * Öğretmenin haftalık programı — gün gün kartlar.
 *
 * Admin'in `WeeklyScheduleGrid`'i saat × gün tablosu; 900px ister ve dar
 * ekranda tek güne düşüp gün seçici gerektirir. Öğretmenin sorusu ise
 * "bu hafta hangi gün kimle dersim var" — o yüzden burada tablo yok: her
 * gün bir kart, kartta o günün dersleri saat sırasıyla. Ders olmayan gün
 * hiç çizilmez. Yatay kaydırma hiçbir genişlikte yok. (EWD panelindeki
 * öğretmen programıyla aynı düzen, Kâğıt Uzay renkleriyle.)
 *
 * İşaretleme ızgaradaki gibi: paket dersi de deneme dersi de satıra
 * dokunarak işlenir / geri alınır. Sıra kuralı RPC'de; reddederse çevrilmiş
 * hata toast olarak düşer. Önizleme (ghost) satırları dokunulmaz.
 */

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/** Öğrenci başına sabit bir aile — satırın sol şeridi ve adın mürekkebi. */
const TONES = ["blue", "mint", "peach", "pink", "violet"] as const;
type Tone = (typeof TONES)[number];

function toneFor(id: string): Tone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

interface TrialLesson {
  id: string;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  lesson_date: string;
}

type Row =
  | { kind: "lesson"; key: string; start: string; end: string; lesson: ActualLesson }
  | { kind: "trial"; key: string; start: string; end: string; trial: TrialLesson };

type Target = { kind: "lesson"; lesson: ActualLesson } | { kind: "trial"; trial: TrialLesson };

/** `yyyy-MM-dd` yerel gün olarak — `new Date(str)` UTC sayar, günü kaydırabilir. */
function dayIndexIn(weekStart: Date, dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - weekStart.getTime()) / 86_400_000);
  return diff >= 0 && diff < 7 ? diff : -1;
}

export function TeacherWeekView({ teacherId }: { teacherId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [lessons, setLessons] = useState<ActualLesson[]>([]);
  const [trials, setTrials] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Target | null>(null);
  const [processing, setProcessing] = useState(false);

  const weekStart = useMemo(() => getWeekStartForOffset(weekOffset), [weekOffset]);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "d MMM", { locale: tr })} – ${format(weekEnd, "d MMM yyyy", { locale: tr })}`;

  /**
   * @param quiet Aynı haftayı tazelerken liste yerinde kalsın; iskelet
   *   yalnızca hafta değişince görünür.
   */
  const load = useCallback(
    async (quiet = false) => {
      if (!teacherId) return;
      if (!quiet) setLoading(true);
      try {
        const supabase = createClient();
        const [actual, trialRes] = await Promise.all([
          fetchActualLessonsForWeek(teacherId, weekStart),
          supabase
            .from("trial_lessons")
            .select("id, start_time, end_time, is_completed, lesson_date")
            .eq("teacher_id", teacherId)
            .gte("lesson_date", format(weekStart, "yyyy-MM-dd"))
            .lte("lesson_date", format(addDays(weekStart, 6), "yyyy-MM-dd")),
        ]);
        if (trialRes.error) throw trialRes.error;
        setLessons(actual);
        setTrials(trialRes.data ?? []);
      } catch {
        toast.error("Ders programı yüklenemedi");
      } finally {
        setLoading(false);
      }
    },
    [teacherId, weekStart],
  );

  useEffect(() => {
    load();
    // Komşu haftalar arka planda insin: oka basınca bekleme olmasın.
    prefetchWeek(teacherId, getWeekStartForOffset(weekOffset + 1));
    prefetchWeek(teacherId, getWeekStartForOffset(weekOffset - 1));
  }, [load, teacherId, weekOffset]);

  useEffect(() => {
    if (!teacherId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`teacher-week-trials-${teacherId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trial_lessons", filter: `teacher_id=eq.${teacherId}` }, () => {
        clearWeekCache();
        load(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, load]);

  const byDay = useMemo(() => {
    const boxes: Row[][] = Array.from({ length: 7 }, () => []);
    for (const l of lessons) {
      const i = dayIndexIn(weekStart, l.lesson_date);
      if (i >= 0) boxes[i].push({ kind: "lesson", key: l.id, start: l.start_time, end: l.end_time, lesson: l });
    }
    for (const t of trials) {
      const i = dayIndexIn(weekStart, t.lesson_date);
      if (i >= 0) boxes[i].push({ kind: "trial", key: t.id, start: t.start_time, end: t.end_time, trial: t });
    }
    boxes.forEach((b) => b.sort((a, b2) => a.start.localeCompare(b2.start)));
    return boxes;
  }, [lessons, trials, weekStart]);

  const total = byDay.reduce((n, d) => n + d.length, 0);
  const today = new Date();

  const done = target ? (target.kind === "lesson" ? target.lesson.status === "completed" : target.trial.is_completed) : false;

  async function settle() {
    if (!target) return;
    setProcessing(true);
    try {
      const result =
        target.kind === "lesson"
          ? done
            ? await undoCompleteLesson(target.lesson.id)
            : await completeLesson(target.lesson.id)
          : done
            ? await undoTrialLesson(target.trial.id)
            : await completeTrialLesson(target.trial.id);
      if (!result.success) throw new Error(translateLessonError(result.error));
      const what = target.kind === "trial" ? "Deneme dersi" : "Ders";
      toast.success(done ? `${what} geri alındı` : `${what} işlendi olarak işaretlendi`);
      setTarget(null);
      // Bu hafta önbellekte duruyor; tazelemeden önce düşür.
      clearWeekCache();
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız oldu");
      setTarget(null);
    } finally {
      setProcessing(false);
    }
  }
  const [settleAction] = useAsyncAction(settle);

  const targetName = target?.kind === "lesson" ? target.lesson.student_name : "Deneme dersi";
  const targetTime = target ? `${formatTime(target.kind === "lesson" ? target.lesson.start_time : target.trial.start_time)}` : "";

  return (
    <div className="flex flex-col gap-3">
      {/* ── Hafta gezinmesi ── */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="pn-btn !min-w-11 !px-0 pointer-fine:!min-w-9" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Önceki hafta">
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <span className="font-display truncate text-[15px] font-semibold text-[color:var(--pn-blue-ink-strong)]">{weekLabel}</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            {weekOffset === 0 ? (
              "Bu hafta"
            ) : (
              // Başka haftadayken bu yazının kendisi dönüş bağlantısı.
              <button type="button" className="uppercase underline underline-offset-2 text-[color:var(--pn-blue-ink)]" onClick={() => setWeekOffset(0)}>
                {weekOffset < 0 ? `${-weekOffset} hafta önce` : `${weekOffset} hafta sonra`} · bu haftaya dön
              </button>
            )}
            {" · "}
            {total} ders
          </span>
        </div>

        <button type="button" className="pn-btn !min-w-11 !px-0 pointer-fine:!min-w-9" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Sonraki hafta">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* ── Gün kartları ── */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[112px] animate-pulse rounded-[var(--pn-r-card)] bg-[color:var(--pn-blue-tint)]" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-[var(--pn-r-card)] border-[1.5px] border-dashed border-[color:var(--pn-blue-line)] px-6 py-5 text-center">
          <p className="font-display text-[15px] font-semibold text-[color:var(--pn-blue-ink)]">Bu hafta ders yok</p>
          <p className="max-w-[260px] text-[12px] text-on-surface-variant">Planlanmış bir ders olduğunda burada gün gün listelenir.</p>
        </div>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {DAYS.map((dayName, i) => {
            const rows = byDay[i];
            if (rows.length === 0) return null;
            const date = addDays(weekStart, i);
            const isToday = isSameDay(date, today);
            return (
              <section
                key={dayName}
                aria-label={`${dayName} dersleri`}
                className={cn(
                  "rounded-[var(--pn-r-card)] border p-3.5 shadow-[var(--pn-shadow-card)]",
                  isToday ? "border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue-sel)]" : "border-[color:var(--pn-hair)] bg-white",
                )}
              >
                <header className="flex items-baseline justify-between gap-2 pb-2.5">
                  <h3 className="font-display flex items-center gap-2 text-[15px] font-semibold text-[color:var(--pn-blue-ink-strong)]">
                    {dayName}
                    {isToday && <span className="pn-tag pn-tag--blue">bugün</span>}
                  </h3>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-on-surface-variant">
                    {format(date, "d MMM", { locale: tr })} · {rows.length} ders
                  </span>
                </header>

                <ul className="flex flex-col gap-1.5">
                  {rows.map((row) => (
                    <li key={row.key}>
                      <DayRow row={row} onPick={setTarget} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmSheet
        open={!!target}
        onOpenChange={(o) => !o && !processing && setTarget(null)}
        tone={done ? "peach" : "mint"}
        destructive={false}
        title={done ? (target?.kind === "trial" ? "Deneme dersini geri al" : "İşlendiyi geri al") : target?.kind === "trial" ? "Deneme dersini işle" : "Dersi işle"}
        description={
          done
            ? `${targetName} · ${targetTime} dersinin işlendiği geri alınacak; bakiye de düzeltilir.`
            : `${targetName} · ${targetTime} dersi işlendi olarak işaretlenecek; süresi bakiyeye eklenir.`
        }
        confirmLabel={processing ? "Kaydediliyor…" : done ? "Geri al" : "İşlendi say"}
        loading={processing}
        onConfirm={settleAction}
      />
    </div>
  );
}

function DayRow({ row, onPick }: { row: Row; onPick: (t: Target) => void }) {
  const isTrial = row.kind === "trial";
  const lesson = row.kind === "lesson" ? row.lesson : null;
  const ghost = !!lesson?.isGhost;
  const completed = isTrial ? row.trial.is_completed : lesson?.status === "completed";
  const moved = !!lesson && !ghost && (!!lesson.original_date || lesson.is_manual_override);
  const tone: Tone = isTrial ? "violet" : toneFor(lesson!.student_id);
  const name = isTrial ? "Deneme dersi" : lesson!.student_name;

  const meta = [
    lesson && !ghost && lesson.lesson_number ? `${lesson.lesson_number}. ders` : null,
    ghost ? "paket bitti" : null,
    moved ? "taşındı" : null,
  ].filter(Boolean);

  const body = (
    <>
      {/* Saat bir kez, solda: başlangıç üstte, bitiş altında. */}
      <span className="flex w-[44px] shrink-0 flex-col font-mono leading-tight tabular-nums">
        <span className="text-[13px] font-semibold text-[color:var(--pn-blue-ink-strong)]">{formatTime(row.start)}</span>
        <span className="text-[11px] text-on-surface-variant">{formatTime(row.end)}</span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-bold" style={{ color: `var(--pn-${tone}-ink-strong)` }}>
          {name}
        </span>
        {(meta.length > 0 || completed) && (
          <span className="truncate text-[12px] text-on-surface-variant">
            {meta.join(" · ")}
            {completed && (
              <span className="font-semibold text-[color:var(--pn-mint-ink)]">
                {meta.length ? " · " : ""}işlendi
              </span>
            )}
          </span>
        )}
      </span>

      {!ghost && (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            completed ? "text-on-surface-variant" : "text-[color:var(--pn-blue-ink)]",
            // Dokunmatikte hover yok: ipucu hep görünsün.
            "[@media(hover:none)]:opacity-100",
          )}
        >
          {completed ? "geri al" : "işaretle"}
        </span>
      )}
    </>
  );

  const base = cn(
    "flex w-full items-center gap-3 rounded-[var(--pn-r-button)] border-l-[3px] px-3 py-2 text-left",
    completed && "opacity-70",
  );
  const style = {
    borderLeftColor: `var(--pn-${tone}-ink)`,
    background: `var(--pn-${tone}-tint)`,
  };

  if (ghost) {
    return (
      <div className={cn(base, "border border-dashed border-l-[3px] opacity-60")} style={{ ...style, borderColor: `var(--pn-${tone}-line)`, borderLeftColor: `var(--pn-${tone}-ink)` }}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(base, "group transition-[background-color,transform] duration-[var(--pn-dur-fast)] hover:brightness-[0.98] active:scale-[0.99]")}
      style={style}
      onClick={() => onPick(row.kind === "lesson" ? { kind: "lesson", lesson: row.lesson } : { kind: "trial", trial: row.trial })}
      aria-label={`${name}, ${formatTime(row.start)} — ${completed ? "işlendi, geri al" : "işlendi olarak işaretle"}`}
    >
      {body}
    </button>
  );
}
