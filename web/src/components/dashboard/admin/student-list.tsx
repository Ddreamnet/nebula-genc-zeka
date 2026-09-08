"use client";

import { Archive, ChevronDown, Clock, RotateCcw, Settings, UserRound } from "lucide-react";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { StudentTopicsSection } from "./student-topics-section";
import { PlaygroundOreButton } from "./playground-ore-button";
import type { Student, Topic, Resource, Group } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

interface StudentListProps {
  students: Student[];
  groups?: Group[];
  onRestoreStudent: (studentId: string) => void;
  onEditStudent: (student: Student) => void;
  onOpenStudentAbout: (student: Student) => void;
  restoringId: string | null;
  expandedStudents: Set<string>;
  studentTopics: Map<string, Topic[]>;
  studentCompletedTopics: Map<string, Topic[]>;
  onToggleStudent: (studentId: string, student: Student) => void;
  onAddTopic: (studentId: string) => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: Topic) => void;
  onEditResource: (resource: Resource) => void;
  onDeleteTopic: (topicId: string, studentId: string, studentUserId: string) => void;
  onDeleteResource: (resourceId: string, studentId: string, studentUserId: string) => void;
}

/**
 * Bir öğretmenin öğrencileri — admin görünümü.
 *
 * Satır dili öğretmen panelindeki konu satırıyla aynı: 12px yarıçap, 1px
 * kontur, sol şerit. Şerit rengi burada bir DURUM değil bir KİMLİK söyler
 * (mavi = aktif, gri = arşivli), çünkü admin'in öğrenciyle ilişkisi ders
 * işlemek değil kayıt yönetmek.
 *
 * Eylemler (Playground cevheri, hakkında, ayarlar) satırın sağında sabit bir
 * kümede durur ve satırın açılıp kapanmasından etkilenmez — açık ve kapalı
 * satırlarda aynı yerde oldukları için göz onları aramak zorunda kalmaz.
 */
export function StudentList({
  students,
  groups = [],
  onRestoreStudent,
  onEditStudent,
  onOpenStudentAbout,
  restoringId,
  expandedStudents,
  studentTopics,
  studentCompletedTopics,
  onToggleStudent,
  onAddTopic,
  onAddResource,
  onEditTopic,
  onEditResource,
  onDeleteTopic,
  onDeleteResource,
}: StudentListProps) {
  const active = students.filter((s) => !s.is_archived);
  const archived = students.filter((s) => s.is_archived);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="flex flex-col gap-1.5">
      {active.length === 0 && (
        <p className="py-10 text-center text-[13px] text-on-surface-variant">Bu öğretmenin henüz aktif öğrencisi yok.</p>
      )}

      {active.map((student) => {
        const isExpanded = expandedStudents.has(student.id);
        const groupName = student.group_id ? groupNameById.get(student.group_id) : null;

        return (
          <div
            key={student.id}
            className="rounded-[12px] border border-l-[3px] border-[color:var(--pn-hair)] border-l-[color:var(--pn-blue-ink)] bg-surface-container"
          >
            <div className="flex items-start gap-2 p-2.5">
              <button
                type="button"
                onClick={() => onToggleStudent(student.id, student)}
                aria-expanded={isExpanded}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <ChevronDown
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-outline transition-transform duration-[.18s]",
                    isExpanded && "rotate-180",
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-on-surface">{student.profiles.full_name}</span>
                    {groupName && <span className="pn-tag pn-tag--violet">{groupName}</span>}
                  </span>
                  <span className="block truncate text-[12px] text-on-surface-variant">{student.profiles.email}</span>
                  {student.lessons.length > 0 && (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {student.lessons.map((lesson) => (
                        <span key={lesson.id} className="pn-chip pn-chip--quiet">
                          <Clock className="size-2.5" strokeWidth={2} aria-hidden />
                          {getDayName(lesson.dayOfWeek).slice(0, 3)} {formatTime(lesson.startTime)}–
                          {formatTime(lesson.endTime)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <PlaygroundOreButton studentUserId={student.student_id} />
                <IconAction label={`${student.profiles.full_name} hakkında`} onClick={() => onOpenStudentAbout(student)}>
                  <UserRound className="size-3.5" strokeWidth={1.9} aria-hidden />
                </IconAction>
                <IconAction label={`${student.profiles.full_name} ayarları`} onClick={() => onEditStudent(student)}>
                  <Settings className="size-3.5" strokeWidth={1.9} aria-hidden />
                </IconAction>
              </div>
            </div>

            <div className="pn-expand" data-open={isExpanded} inert={!isExpanded}>
              <div>
              <div className="border-t border-[color:var(--pn-hair)]">
                <StudentTopicsSection
                  studentId={student.id}
                  studentUserId={student.student_id}
                  studentTopics={studentTopics.get(student.id) ?? []}
                  completedTopics={studentCompletedTopics.get(student.id) ?? []}
                  onAddTopic={onAddTopic}
                  onAddResource={onAddResource}
                  onEditTopic={onEditTopic}
                  onEditResource={onEditResource}
                  onDeleteTopic={onDeleteTopic}
                  onDeleteResource={onDeleteResource}
                />
              </div>
              </div>
            </div>
          </div>
        );
      })}

      {archived.length > 0 && (
        <>
          <p className="pn-divider mt-3">
            <Archive className="size-3" strokeWidth={2} aria-hidden />
            Arşiv · {archived.length}
          </p>
          {archived.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-2 rounded-[12px] border border-l-[3px] border-[color:var(--pn-hair)] border-l-[color:var(--color-outline)] bg-surface-low p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-on-surface-variant">{student.profiles.full_name}</p>
                <p className="truncate text-[12px] text-on-surface-variant">{student.profiles.email}</p>
              </div>
              <button
                type="button"
                className="pn-btn pn-btn--sm pn-btn--paper"
                disabled={restoringId === student.id}
                onClick={() => onRestoreStudent(student.id)}
              >
                <RotateCcw className="size-3.5" strokeWidth={1.9} aria-hidden />
                {restoringId === student.id ? "Geri alınıyor…" : "Geri al"}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[color:var(--pn-hair)] bg-surface-low text-on-surface-variant transition-colors duration-[.16s] hover:bg-[color:var(--pn-blue-tint)] hover:text-[color:var(--pn-blue-ink)] pointer-fine:size-7"
    >
      {children}
    </button>
  );
}
