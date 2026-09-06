"use client";

import { Button } from "@/components/panel-ui/button";
import { Badge } from "@/components/panel-ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { Calendar, AlertCircle } from "lucide-react";
import { formatTime } from "@/lib/lesson/format";
import {
  getActualLessonsForDayAndTime,
  getTrialLessonForDayAndTime,
  isSecondaryInBackToBack,
  getBackToBackGroupForLesson,
  dayIndexToDbDayOfWeek,
  type ActualLesson,
} from "@/lib/lesson/week-cache";
import { cn } from "@/lib/cn";

interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  lesson_date: string;
}

interface StudentLesson {
  id: string;
  student_id: string;
  student_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note?: string | null;
}

interface ScheduleGridCellProps {
  showTemplate: boolean;
  dayIndex: number;
  timeSlot: string;
  lessons: StudentLesson[];
  actualLessons: ActualLesson[];
  trialLessons: TrialLesson[];
  weekStart: Date;
  studentColors: Map<string, string>;
  /** Lets the grid hide every column but one on a phone. */
  className?: string;
  onActualLessonClick: (lesson: ActualLesson) => void;
  onTrialLessonClick: (trial: TrialLesson) => void;
}

/**
 * Shared by every lesson chip in this cell.
 *
 * `h-auto` is the important one. These are <Button>s with no `size`, so they
 * inherited `h-8` — a hard 32px — while the content inside is two stacked
 * lines plus padding, about 46px. The text spilled out of the coloured box and
 * over the table rules, which is most of why this grid looked broken.
 * `min-h-11` then keeps the chip a legal touch target.
 */
const CHIP_BASE = "h-auto min-h-11 flex-col justify-center leading-tight whitespace-normal";

/** Neutral fallback in theme tokens, not Tailwind's stock grey. */
const CHIP_FALLBACK = "bg-surface-dim text-on-surface-variant border-outline-variant";

export function ScheduleGridCell({
  showTemplate,
  dayIndex,
  timeSlot,
  lessons,
  actualLessons,
  trialLessons,
  weekStart,
  studentColors,
  className,
  onActualLessonClick,
  onTrialLessonClick,
}: ScheduleGridCellProps) {
  if (showTemplate) {
    const lesson = lessons.find((l) => l.day_of_week === dayIndexToDbDayOfWeek(dayIndex) && l.start_time === timeSlot);
    return (
      <td className={cn("border border-border p-2", className)}>
        {lesson && (
          <div className={cn("w-full rounded border-2 px-3 py-2", studentColors.get(lesson.student_id) ?? CHIP_FALLBACK)}>
            <div className="text-center">
              <div className="text-xs font-medium">{lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name}</div>
              <div className="mt-1 font-mono text-xs tabular-nums">
                {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
              </div>
            </div>
          </div>
        )}
      </td>
    );
  }

  const slotLessons = getActualLessonsForDayAndTime(actualLessons, dayIndex, timeSlot, weekStart);
  const trialLesson = getTrialLessonForDayAndTime(trialLessons, dayIndex, timeSlot, weekStart);

  const visibleLessons = slotLessons.filter((l) => !isSecondaryInBackToBack(actualLessons, dayIndex, l.id, weekStart));

  if (visibleLessons.length === 0 && !trialLesson) {
    return <td className={cn("border border-border p-2", className)} />;
  }

  type RenderItem = { type: "b2b"; lesson: ActualLesson; group: ActualLesson[] } | { type: "single"; lesson: ActualLesson } | { type: "trial"; trial: TrialLesson };

  const renderItems: RenderItem[] = [];

  for (const lesson of visibleLessons) {
    const b2bGroup = getBackToBackGroupForLesson(actualLessons, dayIndex, lesson.id, weekStart);
    if (b2bGroup) {
      renderItems.push({ type: "b2b", lesson, group: b2bGroup });
    } else {
      renderItems.push({ type: "single", lesson });
    }
  }
  if (trialLesson && visibleLessons.length === 0) {
    renderItems.push({ type: "trial", trial: trialLesson });
  }

  const isMulti = renderItems.length > 1;

  return (
    <td className={cn("border border-border p-1", className)}>
      <div className="flex h-full gap-1">
        {renderItems.map((item) => {
          if (item.type === "b2b") {
            const al = item.lesson;
            return (
              <Popover key={al.id}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      CHIP_BASE,
                      isMulti ? "min-w-0 flex-1 px-1 py-1.5" : "w-full px-2 py-2",
                      "relative cursor-pointer",
                      al.status === "completed" && "opacity-40",
                      al.is_manual_override && "ring-2 ring-tertiary ring-offset-1",
                      studentColors.get(al.student_id) ?? CHIP_FALLBACK,
                    )}
                  >
                    <div className="text-center truncate">
                      <div className="flex items-center justify-center gap-1 text-xs font-medium">
                        {al.is_manual_override && <Calendar className="h-3 w-3 shrink-0 text-tertiary" />}
                        <span className="truncate">{al.student_name}</span>
                        <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                          {item.group.length} ders
                        </Badge>
                      </div>
                      {!isMulti &&
                        item.group.map((l) => (
                          <div key={l.id} className="mt-0.5 font-mono text-xs tabular-nums">
                            {formatTime(l.start_time)} - {formatTime(l.end_time)}
                          </div>
                        ))}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex flex-col gap-1">
                    {item.group.map((l) => (
                      <Button key={l.id} variant="ghost" size="sm" className="justify-start text-xs" onClick={() => onActualLessonClick(l)}>
                        {formatTime(l.start_time)} - {formatTime(l.end_time)}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          if (item.type === "single") {
            const al = item.lesson;
            return (
              <Button
                key={al.id}
                variant="outline"
                className={cn(
                  CHIP_BASE,
                  isMulti ? "min-w-0 flex-1 px-1 py-1.5" : "w-full px-2 py-2",
                  "relative",
                  al.isGhost ? "cursor-default" : "cursor-pointer",
                  !al.isGhost && al.status === "completed" && "opacity-40",
                  !al.isGhost && al.is_manual_override && "ring-2 ring-tertiary ring-offset-1",
                  studentColors.get(al.student_id) ?? CHIP_FALLBACK,
                )}
                onClick={() => !al.isGhost && onActualLessonClick(al)}
              >
                {al.isGhost && <AlertCircle className="absolute right-1 top-1 h-3 w-3 text-tertiary" />}
                <div className="w-full truncate text-center">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium">
                    {!al.isGhost && al.is_manual_override && <Calendar className="h-3 w-3 shrink-0 text-tertiary" />}
                    <span className="truncate">{al.student_name}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-xs tabular-nums">
                    {formatTime(al.start_time)} - {formatTime(al.end_time)}
                  </div>
                </div>
              </Button>
            );
          }

          const tl = item.trial;
          return (
            <Button
              key={tl.id}
              variant="outline"
              className={cn(
                CHIP_BASE,
                isMulti ? "min-w-0 flex-1 px-1 py-1.5" : "w-full px-2 py-2",
                "border-2 transition-all",
                tl.is_completed
                  ? "border-error/30 bg-error/10 text-error/60 opacity-40 hover:bg-error/15"
                  : "border-error/60 bg-error/20 text-error hover:bg-error/30",
              )}
              onClick={() => onTrialLessonClick(tl)}
            >
              <div className="text-center w-full truncate">
                <div className="text-xs font-medium">Deneme</div>
                <div className="mt-0.5 font-mono text-xs tabular-nums">
                  {formatTime(tl.start_time)} - {formatTime(tl.end_time)}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </td>
  );
}
