"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmSheet } from "@/components/panel-ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { clearWeekCache } from "@/lib/lesson/week-cache";
import { completeLesson, undoCompleteLesson, getNextCompletableInstance, getLastCompletedInstance } from "@/lib/lesson/service";
import { translateLessonError } from "@/lib/lesson/errors";
import { useAsyncAction } from "@/lib/use-async-action";
import type { LessonInstance } from "@/lib/lesson/types";

/** "2026-09-06" → YEREL 6 Eylül. `new Date(str)` bunu UTC gece yarısı olarak
 *  ayrıştırır ve negatif ofsetli bir saat diliminde bir gün geriye kayar. */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const MONTHS = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
const shortDate = (value: string) => {
  const d = parseLocalDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

type BoxState = "completed" | "now" | "planned" | "moved";
const STATE_LABEL: Record<BoxState, string> = {
  completed: "işlendi",
  now: "şu an",
  planned: "planlı",
  moved: "ertelendi",
};

/** Paketin haftası kaç dersten oluşuyorsa o kadar satır. İki derste 5a'nın
 *  etiketleri (tek sayılar teori, çiftler lab); tek derste etiket yok —
 *  her kutuda aynı kelimeyi tekrar eden bir satır etiketi bilgi taşımaz. */
function rowLabels(perWeek: number): string[] {
  if (perWeek === 2) return ["Teori", "Lab"];
  if (perWeek === 1) return [];
  return Array.from({ length: perWeek }, (_, i) => `${i + 1}.`);
}
const LABEL_INK = ["var(--pn-blue-ink-strong)", "var(--pn-pink-ink-strong)"];

interface Props {
  studentId: string;
  teacherId: string;
  /** Öğretmen: sıradaki dersi işaretler, sonuncuyu geri alır. Öğrenci: salt okunur. */
  editable?: boolean;
  /** Öğrenci ekranı: öğretmen işaretlediği anda kendi kendine tazelenir. */
  realtime?: boolean;
  studentName: string;
  now: Date;
}

/**
 * Paket ızgarası (5a).
 *
 * Paket = haftalık ders sayısı × 4 hafta (`getRemainingRights` ile aynı
 * formül). Kolon bir hafta, satır o haftanın kaçıncı dersi. Çizgi ya da
 * bağlantı yok: hizalamanın kendisi ilişkiyi anlatıyor.
 *
 * Yazma kuralları RPC'nin kuralları: yalnızca SIRADAKİ planlı ders
 * işaretlenir, yalnızca SON işlenen geri alınır. Diğer kutular pasif.
 */
export function PackageGrid({ studentId, teacherId, editable = false, realtime = false, studentName, now }: Props) {
  const [instances, setInstances] = useState<LessonInstance[] | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ instance: LessonInstance; mode: "complete" | "undo" } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: tracking } = await supabase
      .from("student_lesson_tracking")
      .select("package_cycle")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    const cycle = tracking?.package_cycle ?? 1;

    const [rows, next, last] = await Promise.all([
      supabase
        .from("lesson_instances")
        .select("id, lesson_number, lesson_date, start_time, end_time, status, original_date, is_manual_override")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .eq("package_cycle", cycle)
        .in("status", ["planned", "completed"])
        .order("lesson_number"),
      editable ? getNextCompletableInstance(studentId, teacherId, cycle) : Promise.resolve(null),
      editable ? getLastCompletedInstance(studentId, teacherId, cycle) : Promise.resolve(null),
    ]);

    setInstances((rows.data as LessonInstance[]) ?? []);
    setNextId(next?.id ?? null);
    setLastId(last?.id ?? null);
  }, [studentId, teacherId, editable]);

  useEffect(() => {
    if (!studentId || !teacherId) return;
    load();
    if (!realtime) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`package-grid-${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lesson_instances", filter: `student_id=eq.${studentId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, teacherId, realtime, load]);

  const grid = useMemo(() => {
    if (!instances || instances.length === 0) return null;
    // Haftalık ders sayısı VERİDEN: derslerin planlandığı (erteleme öncesi)
    // haftalarda en kalabalık hafta. `sayı / 4` iptal edilmiş bir ders
    // listeden düştüğünde yanlış çıkıyordu (2×4'ten 3 iptal → 5 → 1 satır).
    const perWeekCount = new Map<string, number>();
    for (const instance of instances) {
      const date = parseLocalDate(instance.original_date ?? instance.lesson_date);
      const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
      const key = monday.toDateString();
      perWeekCount.set(key, (perWeekCount.get(key) ?? 0) + 1);
    }
    const perWeek = Math.max(1, ...perWeekCount.values());
    const columns: LessonInstance[][] = [];
    for (let i = 0; i < instances.length; i += perWeek) columns.push(instances.slice(i, i + perWeek));
    return { perWeek, columns };
  }, [instances]);

  function stateOf(instance: LessonInstance): BoxState {
    if (instance.status === "completed") return "completed";
    const date = parseLocalDate(instance.lesson_date);
    if (date.toDateString() === now.toDateString()) {
      const minutes = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = instance.start_time.split(":").map(Number);
      const [eh, em] = instance.end_time.split(":").map(Number);
      if (minutes >= sh * 60 + sm && minutes < eh * 60 + em) return "now";
    }
    if (instance.original_date && instance.original_date !== instance.lesson_date) return "moved";
    return "planned";
  }

  async function confirm() {
    if (!pending) return;
    const { instance, mode } = pending;
    try {
      const result = mode === "complete" ? await completeLesson(instance.id) : await undoCompleteLesson(instance.id);
      if (!result.success) {
        toast.error(translateLessonError(result.error));
        return;
      }
      clearWeekCache();
      await load();
      toast.success(mode === "complete" ? "Ders işlendi olarak işaretlendi" : "Son ders geri alındı");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    } finally {
      setPending(null);
    }
  }
  const [runConfirm, running] = useAsyncAction(confirm);

  if (instances === null) {
    // Kutuların yüksekliği kadar yer tutulur: yüklendiğinde kart zıplamaz.
    return <div className="h-[118px] w-full animate-pulse rounded-[12px] bg-[color:rgba(255,251,242,.55)] lg:h-[100px]" />;
  }
  if (!grid) {
    return <p className="text-[13px] text-[color:var(--pn-ink-2)]">Bu paket için planlanmış ders yok.</p>;
  }

  const labels = rowLabels(grid.perWeek);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  return (
    <>
      <div
        className="pn-pkg w-full"
        role="group"
        aria-label={`${studentName} — paket`}
        style={{
          ["--pkg-cols" as string]: grid.columns.length,
          gridTemplateColumns: labels.length ? undefined : `repeat(${grid.columns.length}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: grid.perWeek }, (_, row) => (
          <RowCells key={row}>
            {labels.length > 0 && (
              <span className="pn-pkg-label" style={{ color: LABEL_INK[row] ?? "var(--pn-blue-ink-strong)" }}>
                {labels[row]}
              </span>
            )}
            {grid.columns.map((column, col) => {
              const instance = column[row];
              if (!instance) return <span key={col} />;
              const state = stateOf(instance);
              const isNext = editable && instance.id === nextId;
              const isLast = editable && instance.id === lastId;
              const label = `${instance.lesson_number}. ders · ${shortDate(instance.lesson_date)} ${instance.start_time.slice(0, 5)} · ${STATE_LABEL[state]}`;
              if (!editable) {
                return (
                  <span key={instance.id} className="pn-pkg-box" data-state={state} title={label} aria-label={label}>
                    {instance.lesson_number}
                  </span>
                );
              }
              return (
                <button
                  key={instance.id}
                  type="button"
                  className="pn-pkg-box"
                  data-state={state}
                  data-next={isNext || undefined}
                  disabled={!isNext && !isLast}
                  onClick={() => setPending({ instance, mode: isLast ? "undo" : "complete" })}
                  aria-label={isNext ? `${label} — işaretle` : isLast ? `${label} — geri al` : label}
                  title={
                    isNext
                      ? "İşlendi olarak işaretle"
                      : isLast
                        ? "Geri al"
                        : instance.status === "completed"
                          ? "Yalnızca en son işlenen ders geri alınabilir"
                          : "Sırayla işaretlenir — önce bir önceki ders"
                  }
                >
                  {instance.lesson_number}
                </button>
              );
            })}
          </RowCells>
        ))}

        {/* Tarih satırı: her kolonun altında haftanın tarihi. Ertelenen ders
            yeni tarihini ikinci satırda pembe "+ 28 EYL" olarak taşır — kutu,
            tarih ve vurgu aynı kolonda. */}
        {labels.length > 0 && <span />}
        {grid.columns.map((column, col) => {
          const first = column[0];
          const anchor = first.original_date ?? first.lesson_date;
          const anchorDate = parseLocalDate(anchor);
          const current = anchorDate >= monday && anchorDate <= sunday;
          const moved = column.filter((i) => i.original_date && i.original_date !== i.lesson_date);
          return (
            <span key={col} className="pn-pkg-date" data-current={current || undefined}>
              {shortDate(anchor)}
              {moved.map((i) => (
                <span key={i.id} className="pn-pkg-date-moved">
                  + {shortDate(i.lesson_date)}
                </span>
              ))}
            </span>
          );
        })}
      </div>

      {editable && (
        <ConfirmSheet
          open={!!pending}
          onOpenChange={(open) => !open && setPending(null)}
          tone={pending?.mode === "undo" ? "peach" : "mint"}
          destructive={false}
          title={pending?.mode === "undo" ? "Son dersi geri al" : "Dersi işaretle"}
          description={
            pending?.mode === "undo"
              ? `${studentName} için son işlenen ders geri alınacak; bakiye de düzeltilecek.`
              : `${studentName} için ${pending?.instance.lesson_number}. ders işlendi olarak işaretlenecek.`
          }
          confirmLabel={running ? "İşleniyor…" : pending?.mode === "undo" ? "Geri al" : "Onayla"}
          loading={running}
          onConfirm={runConfirm}
        />
      )}
    </>
  );
}

/** Grid'in satırları düz çocuklardır; bu yalnızca okunurluk için bir sarmal. */
function RowCells({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
