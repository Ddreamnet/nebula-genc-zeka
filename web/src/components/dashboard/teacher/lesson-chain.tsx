"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/panel-ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { clearWeekCache } from "@/lib/lesson/week-cache";
import { completeLesson, undoCompleteLesson, getNextCompletableInstance, getLastCompletedInstance } from "@/lib/lesson/service";
import { translateLessonError } from "@/lib/lesson/errors";
import { useAsyncAction } from "@/lib/use-async-action";
import type { LessonInstance } from "@/lib/lesson/types";
import { cn } from "@/lib/cn";

/** "2026-09-06" → YEREL 6 Eylül. `new Date(str)` bunu UTC gece yarısı olarak
 *  ayrıştırır ve negatif ofsetli bir saat diliminde bir gün geriye kayar. */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const SHORT_DAYS = ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"];

type ChainLink = "linked" | "broken" | "none";

/** Zincir geometrisi VERİDEN türetilir, elle yerleştirilmez. Kopuk bir çiftte
 *  boşluk büyür ve halkalar küçülür; `ringBottom` ikisinden hesaplandığı için
 *  halkalar her durumda boşluğun tam ortasında kalır. Sabit bir değer
 *  yazılsaydı kopuk çiftte halkalar boşluğu ıskalardı. */
const CHAIN_GEOMETRY: Record<ChainLink, { gap: number; ring: number; ink: string }> = {
  linked: { gap: 14, ring: 14, ink: "var(--color-outline)" },
  broken: { gap: 26, ring: 9, ink: "var(--pn-pink-ink)" },
  none: { gap: 20, ring: 14, ink: "transparent" },
};

type LessonState = "completed" | "now" | "planned" | "moved";

const STATE_STYLE: Record<LessonState, { bg: string; line: string; tone: string; ring: string; label: string }> = {
  completed: {
    bg: "var(--pn-mint-sel)",
    line: "rgba(15,107,65,.28)",
    tone: "var(--pn-mint-ink)",
    ring: "var(--pn-mint)",
    label: "İşlendi",
  },
  now: {
    bg: "var(--pn-peach-sel)",
    line: "var(--pn-peach-line)",
    tone: "var(--pn-peach-ink)",
    ring: "var(--pn-peach)",
    label: "Şu an",
  },
  planned: {
    bg: "var(--color-surface-container)",
    line: "var(--pn-hair)",
    tone: "var(--color-on-surface-variant)",
    ring: "var(--color-surface-low)",
    label: "Planlı",
  },
  moved: {
    bg: "var(--pn-pink-sel)",
    line: "var(--pn-pink-line)",
    tone: "var(--pn-pink-ink)",
    ring: "var(--pn-pink)",
    label: "Ertelendi",
  },
};

interface Props {
  studentId: string;
  studentName: string;
  teacherId: string;
  /** Şu an işlenmekte olan dersin saat aralığı — "ŞU AN" rozetini bu belirler. */
  activeRange?: { start: string; end: string } | null;
  onChanged?: () => void;
}

/**
 * Ders zinciri.
 *
 * `lesson_instances` şemasında HER 40 dakikalık ders ayrı bir satırdır
 * (kendi `lesson_number`, tarihi, saati, planned/completed durumu). Dersler
 * haftada bir gün 40+40 işlendiği için aynı günde iki satır olur. Tek bir
 * "Ders işlendi" butonu bu yüzden yanlıştı: hangi satırı tamamladığını
 * söyleyemiyordu. Burada her ders kendi satırı, aynı günün iki dersi
 * aralarındaki iki yarım halkayla bağlı.
 *
 * Yazma kuralları değişmedi: yalnızca SIRADAKİ planlı ders tamamlanabilir ve
 * yalnızca SON tamamlanan ders geri alınabilir (ikisi de RPC'nin kendi
 * kısıtı; arayüz sadece aynı kısıtı görünür kılar).
 */
export function LessonChain({ studentId, studentName, teacherId, activeRange, onChanged }: Props) {
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [nextId, setNextId] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<{ instance: LessonInstance; mode: "complete" | "undo" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
        .order("lesson_date")
        .order("start_time"),
      getNextCompletableInstance(studentId, teacherId, cycle),
      getLastCompletedInstance(studentId, teacherId, cycle),
    ]);

    setInstances((rows.data as LessonInstance[]) ?? []);
    setNextId(next?.id ?? null);
    setLastId(last?.id ?? null);
    setLoading(false);
  }, [studentId, teacherId]);

  useEffect(() => {
    if (!studentId || !teacherId) return;
    load();
  }, [studentId, teacherId, load]);

  /**
   * Odak günü: sıradaki tamamlanabilir dersin günü. O yoksa son işlenen
   * dersin günü, o da yoksa ilk satır. Masaüstünde varsayılan görünüm bu
   * günün çiftidir — dört satır + boşlukları şeridi 314px'e çıkarıp altındaki
   * satırı aç bırakıyordu.
   */
  const focusDate = useMemo(() => {
    const focus = instances.find((i) => i.id === nextId) ?? instances.find((i) => i.id === lastId) ?? instances[0];
    return focus?.lesson_date ?? null;
  }, [instances, nextId, lastId]);

  /** Odak gününü içeren Pazartesi–Pazar haftası — açılır görünümün kapsamı. */
  const weekRows = useMemo(() => {
    if (!focusDate) return [];
    const focus = parseLocalDate(focusDate);
    const mondayOffset = (focus.getDay() + 6) % 7;
    const monday = new Date(focus);
    monday.setDate(focus.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return instances.filter((i) => {
      const date = parseLocalDate(i.lesson_date);
      return date >= monday && date <= sunday;
    });
  }, [instances, focusDate]);

  const dayRows = useMemo(
    () => (focusDate ? instances.filter((i) => i.lesson_date === focusDate) : []),
    [instances, focusDate],
  );

  const visible = expanded ? weekRows : dayRows;

  function stateOf(instance: LessonInstance): LessonState {
    if (instance.status === "completed") return "completed";
    if (
      activeRange &&
      instance.lesson_date === toIsoDate(new Date()) &&
      instance.start_time.slice(0, 5) === activeRange.start &&
      instance.end_time.slice(0, 5) === activeRange.end
    ) {
      return "now";
    }
    if (instance.is_manual_override && instance.original_date && instance.original_date !== instance.lesson_date) {
      return "moved";
    }
    return "planned";
  }

  function linkAfter(index: number, rows: LessonInstance[]): ChainLink {
    const current = rows[index];
    const next = rows[index + 1];
    if (!next) return "none";
    if (current.lesson_date === next.lesson_date) return "linked";
    // Aynı gün için planlanmış ama artık ayrı günlere düşmüş bir çift:
    // kopukluk bir etiketle değil, ŞEKLİN KENDİSİYLE anlatılır.
    const currentOrigin = current.original_date ?? current.lesson_date;
    const nextOrigin = next.original_date ?? next.lesson_date;
    return currentOrigin === nextOrigin ? "broken" : "none";
  }

  function onRowClick(instance: LessonInstance) {
    if (instance.status === "completed") {
      if (instance.id !== lastId) return;
      setPending({ instance, mode: "undo" });
      return;
    }
    if (instance.id !== nextId) return;
    setPending({ instance, mode: "complete" });
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
      onChanged?.();
      toast.success(mode === "complete" ? "Ders işlendi olarak işaretlendi" : "Son ders geri alındı");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    } finally {
      setPending(null);
    }
  }

  const [runConfirm, running] = useAsyncAction(confirm);

  if (loading) {
    // Görünen satır sayısı kadar yer tutulur: yüklendiğinde blok zıplamaz.
    return <div className="h-[104px] animate-pulse rounded-[12px] bg-[color:var(--pn-blue-tint)]" />;
  }

  if (visible.length === 0) {
    return <p className="text-[12px] text-[color:var(--pn-blue-ink-strong)]">Bu paket için planlanmış ders yok.</p>;
  }

  return (
    <>
      <div className="flex flex-col">
        {visible.map((instance, index) => {
          const state = stateOf(instance);
          const style = STATE_STYLE[state];
          const link = linkAfter(index, visible);
          const geometry = CHAIN_GEOMETRY[link];
          const gap = index === visible.length - 1 ? 0 : geometry.gap;
          const ringBottom = (gap - geometry.ring) / 2;
          const actionable =
            (instance.status === "planned" && instance.id === nextId) ||
            (instance.status === "completed" && instance.id === lastId);
          const date = parseLocalDate(instance.lesson_date);

          return (
            <div key={instance.id} className="relative" style={{ paddingBottom: gap }}>
              <button
                type="button"
                onClick={() => onRowClick(instance)}
                disabled={!actionable}
                title={
                  actionable
                    ? instance.status === "completed"
                      ? "Bu dersi geri al"
                      : "Bu dersi işlendi olarak işaretle"
                    : instance.status === "completed"
                      ? "Yalnızca en son işlenen ders geri alınabilir"
                      : "Sırayla işaretlenir — önce bir önceki ders"
                }
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[11px] border px-2.5 py-2 text-left transition-transform duration-[.16s]",
                  actionable ? "cursor-pointer hover:-translate-y-px" : "cursor-default",
                )}
                style={{ background: style.bg, borderColor: style.line }}
              >
                <span
                  aria-hidden
                  className="grid size-[19px] shrink-0 place-items-center rounded-full border-[1.5px]"
                  style={{ background: style.ring, borderColor: style.tone }}
                >
                  <Check
                    className="size-2.5"
                    strokeWidth={3.2}
                    style={{ color: state === "completed" ? style.tone : "rgba(21,35,67,.22)" }}
                  />
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-on-surface">{instance.lesson_number}. ders</span>
                <span
                  className="shrink-0 font-mono text-[10px] font-semibold tracking-wider"
                  style={{ color: style.tone }}
                >
                  {SHORT_DAYS[date.getDay()]}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-on-surface-variant">
                  {instance.start_time.slice(0, 5)} – {instance.end_time.slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1" />
                <span className="pn-tag shrink-0" style={{ background: style.ring, color: style.tone }}>
                  {style.label}
                </span>
              </button>

              {/* Aynı günün iki dersini bağlayan yarım halkalar. Kart
                  kenarından 14px içeride, 7px genişliğinde; kopuk çiftte
                  mercan renginde ve kısalır. */}
              {gap > 0 && (
                <>
                  <span
                    aria-hidden
                    className="absolute left-3.5 box-border w-[7px] rounded-l-full border-2 border-r-0"
                    style={{ bottom: ringBottom, height: geometry.ring, borderColor: geometry.ink }}
                  />
                  <span
                    aria-hidden
                    className="absolute right-3.5 box-border w-[7px] rounded-r-full border-2 border-l-0"
                    style={{ bottom: ringBottom, height: geometry.ring, borderColor: geometry.ink }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {weekRows.length > dayRows.length && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[color:var(--pn-blue-line)] bg-[color:rgba(255,251,242,.72)] py-2 text-[12px] font-semibold text-[color:var(--pn-blue-ink-strong)] transition-colors duration-[.16s] hover:bg-surface-container"
        >
          {expanded ? "Yalnızca bugün" : "Bu haftanın tümü"}
          <span className="font-mono text-[10px] font-semibold text-[color:var(--pn-blue-ink)]">
            {weekRows.length} ders
          </span>
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-[.18s]", expanded && "rotate-180")}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.mode === "undo" ? "Son dersi geri al" : "Dersi işaretle"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mode === "undo"
                ? `${studentName} için son işlenen dersi geri almak istiyor musunuz? Öğretmen bakiyesi de düzeltilecek.`
                : `${studentName} için ${pending?.instance.lesson_number}. dersi işlendi olarak işaretlemek istiyor musunuz?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm} disabled={running}>
              {running ? "İşleniyor…" : pending?.mode === "undo" ? "Geri al" : "Onayla"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
