"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { LessonInstance } from "@/lib/lesson/types";
import { cn } from "@/lib/cn";

/**
 * Öğrencinin kendi ilerlemesi — öğretmen panelindeki öğrenci listesinin
 * karşılığı, aynı 195px'lik kolonda.
 *
 * Öğretmenin sorusu "sıradaki kim", öğrencininki "nerede kaldım". İkisi de
 * panelin sol kenarında, aynı kart dilinde cevaplanır; iki panelin aynı ürün
 * gibi okunmasını sağlayan şey bu simetri.
 *
 * Salt okunur: öğrenci kendi dersini işaretleyemez. Bu yüzden kutular
 * <button> değil <span> — tıklanabilir görünen ama tıklanamayan bir şey,
 * çalışmayan bir düğmedir.
 */
export function ProgressRail({ studentId, weekNumber }: { studentId: string; weekNumber: number | null }) {
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [loading, setLoading] = useState(true);
  // studentId için sabit: her sorguda yeniden okunmasın.
  const teacherIdRef = useRef<string | null>(null);

  const fetchInstances = useCallback(async () => {
    const teacherId = teacherIdRef.current;
    if (!teacherId) return;
    const supabase = createClient();
    const { data: tracking } = await supabase
      .from("student_lesson_tracking")
      .select("package_cycle")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    const { data } = await supabase
      .from("lesson_instances")
      .select("id, lesson_number, lesson_date, start_time, end_time, status, original_date, is_manual_override")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .eq("package_cycle", tracking?.package_cycle ?? 1)
      .in("status", ["planned", "completed"])
      .order("lesson_date")
      .order("start_time");

    setInstances((data as LessonInstance[]) ?? []);
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase.from("students").select("teacher_id").eq("student_id", studentId).single();
      if (cancelled || !data) {
        setLoading(false);
        return;
      }
      teacherIdRef.current = data.teacher_id;
      await fetchInstances();
      if (!cancelled) setLoading(false);
    })();

    // Öğretmen dersi işaretlediği anda öğrencinin ekranı da değişir —
    // yenilemesi gerekmez.
    const channel = supabase
      .channel(`student-instances-${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lesson_instances", filter: `student_id=eq.${studentId}` },
        () => fetchInstances(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [studentId, fetchInstances]);

  const done = instances.filter((i) => i.status === "completed").length;
  const total = instances.length;
  const next = instances.find((i) => i.status === "planned");

  return (
    <section className="pn-card min-h-0" aria-label="İlerlemem">
      <div className="pn-band pn-band--mint gap-2">
        <h2 className="pn-card-title whitespace-nowrap">İlerlemem</h2>
        <span className="flex-1" />
        {weekNumber !== null && <span className="pn-chip pn-chip--mint">{weekNumber}. hafta</span>}
      </div>

      <div className="pn-scroll flex min-h-0 flex-1 flex-col gap-3 p-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-[12px] bg-[color:var(--pn-mint-tint)]" />
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pn-mint-ink)]">
                  İşlenen ders
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[color:var(--pn-mint-ink)]">
                  {done}/{total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[color:rgba(21,35,67,.12)]">
                <div
                  className="h-full rounded-full bg-[color:var(--pn-mint-ink)] transition-[width] duration-[.26s]"
                  style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : "0%" }}
                />
              </div>
            </div>

            {/* Ders kareleri: paketin tamamı bir bakışta. Ertelenen bir ders
                şeftali konturuyla ayrılır — tarihi değişmiş demektir. */}
            {total > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1.5">
                {instances.map((instance, index) => {
                  const isDone = instance.status === "completed";
                  const moved = !!instance.original_date && instance.original_date !== instance.lesson_date;
                  return (
                    <span
                      key={instance.id}
                      title={`${index + 1}. ders · ${format(new Date(instance.lesson_date), "d MMM", { locale: tr })} · ${
                        isDone ? "işlendi" : "planlı"
                      }${moved ? " · ertelendi" : ""}`}
                      className={cn(
                        "grid aspect-square place-items-center rounded-[8px] border text-[11px] font-semibold tabular-nums",
                        isDone
                          ? "border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint)] text-[color:var(--pn-mint-ink-strong)]"
                          : "border-[color:var(--pn-hair)] bg-surface-low text-on-surface-variant",
                        moved && "border-[color:var(--pn-peach-line)]",
                      )}
                    >
                      {index + 1}
                    </span>
                  );
                })}
              </div>
            )}

            {next && (
              <div className="rounded-[12px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue-sel)] p-2.5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pn-blue-ink)]">
                  Sıradaki ders
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-on-surface">
                  {format(new Date(next.lesson_date), "d MMMM EEEE", { locale: tr })}
                </p>
                <p className="font-mono text-[10px] tabular-nums text-on-surface-variant">
                  {next.start_time.slice(0, 5)} – {next.end_time.slice(0, 5)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
