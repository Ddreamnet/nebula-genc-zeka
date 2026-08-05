"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/panel-ui/card";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getRowConfig } from "@/lib/lesson/format";
import type { LessonInstance } from "@/lib/lesson/types";
import { cn } from "@/lib/cn";

interface StudentLessonTrackerProps {
  studentId: string;
}

export function StudentLessonTracker({ studentId }: StudentLessonTrackerProps) {
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Shared across fetchInstances/fetchTemplateCount/the realtime handler so
  // "students.teacher_id" (which never changes for a given studentId) is
  // looked up once instead of once per fetch function.
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

    const currentCycle = tracking?.package_cycle ?? 1;

    const { data } = await supabase
      .from("lesson_instances")
      .select("*")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .eq("package_cycle", currentCycle)
      .in("status", ["planned", "completed"])
      .order("lesson_date", { ascending: true })
      .order("start_time", { ascending: true });

    setInstances((data as LessonInstance[]) ?? []);
  }, [studentId]);

  const fetchTemplateCount = useCallback(async () => {
    const teacherId = teacherIdRef.current;
    if (!teacherId) return;
    const supabase = createClient();

    const { count } = await supabase.from("student_lessons").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("teacher_id", teacherId);

    setTemplateCount(count ?? 0);
  }, [studentId]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", studentId)
        .single();
      if (studentError || !studentData) {
        setLoading(false);
        return;
      }
      teacherIdRef.current = studentData.teacher_id;
      await Promise.all([fetchInstances(), fetchTemplateCount()]);
      setLoading(false);
    }
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel("student-instance-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_instances", filter: `student_id=eq.${studentId}` }, () => {
        fetchInstances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, fetchInstances, fetchTemplateCount]);

  const totalLessonsPerMonth = templateCount * 4;
  const rowConfig = getRowConfig(templateCount);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-full items-center p-4">
          <div className="animate-pulse h-20 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  function renderBox(inst: LessonInstance, displayPosition: number) {
    const isCompleted = inst.status === "completed";
    const isRescheduled = inst.original_date !== null;
    const timeInfo = `${inst.start_time.slice(0, 5)} - ${inst.end_time.slice(0, 5)}`;

    return (
      <div key={inst.id} className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            "h-8 w-8 sm:h-9 sm:w-9 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-xs font-semibold shadow-sm",
            isCompleted ? "bg-primary text-primary-foreground border-primary scale-95 shadow-md" : "bg-muted/50 border-muted-foreground/20",
          )}
          title={`Ders ${displayPosition + 1} - ${timeInfo}`}
        >
          {displayPosition + 1}
        </div>
        <span className={cn("text-[10px] whitespace-nowrap", isRescheduled ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground")}>
          {format(new Date(inst.lesson_date), "dd.MM")}
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex h-full items-center p-3 sm:p-4">
        {/* Mobile: the card now shares its row with the "Hafta" card (half
           width), so it's always a flat 2-per-row grid here — the desktop
           row/buttonsPerRow math below assumes a full-width card and wraps
           unpredictably (e.g. 3-then-1) at this width. */}
        <div className="grid w-full grid-cols-2 justify-items-center gap-2 sm:hidden">
          {instances.slice(0, totalLessonsPerMonth).map((inst, i) => renderBox(inst, i))}
        </div>

        <div className="hidden w-full justify-center sm:flex">
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: rowConfig.rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex flex-wrap gap-2.5 justify-center">
                {Array.from({ length: rowConfig.buttonsPerRow }, (_, colIndex) => {
                  const displayPosition = rowIndex * rowConfig.buttonsPerRow + colIndex;
                  if (displayPosition >= totalLessonsPerMonth) return null;

                  const inst = instances[displayPosition];
                  if (!inst) return null;

                  return renderBox(inst, displayPosition);
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
