"use client";

import { Card, CardContent } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Badge } from "@/components/panel-ui/badge";
import { Clock, Archive, RotateCcw, Settings, ChevronDown, ChevronRight, FileUser } from "lucide-react";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { StudentTopicsSection } from "./student-topics-section";
import { PlaygroundOreButton } from "./playground-ore-button";
import type { Student, Topic, Resource, Group } from "@/lib/admin/types";

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
  const activeStudents = students.filter((s) => !s.is_archived);
  const archivedStudents = students.filter((s) => s.is_archived);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-3">
      {activeStudents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Bu öğretmenin henüz aktif öğrencisi yok.</p>
      ) : (
        activeStudents.map((student) => {
          const isExpanded = expandedStudents.has(student.id);
          return (
            <Card key={student.id} className="border">
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <button
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  onClick={() => onToggleStudent(student.id, student)}
                  aria-label="Konuları göster"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium">{student.profiles.full_name}</h4>
                      {student.group_id && groupNameById.has(student.group_id) && (
                        <Badge variant="secondary" className="text-[10px]">
                          Grup: {groupNameById.get(student.group_id)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.profiles.email}</p>

                    {student.lessons.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {student.lessons.map((lesson, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {getDayName(lesson.dayOfWeek)} {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <PlaygroundOreButton studentUserId={student.student_id} />
                  <Button variant="ghost" size="sm" aria-label="Öğrenci hakkında" onClick={() => onOpenStudentAbout(student)}>
                    <FileUser className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Öğrenci ayarları" onClick={() => onEditStudent(student)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {isExpanded && (
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
              )}
            </Card>
          );
        })
      )}

      {archivedStudents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm text-muted-foreground">Arşivlenmiş Öğrenciler</h4>
            <Badge variant="secondary" className="text-xs">
              {archivedStudents.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {archivedStudents.map((student) => (
              <Card key={student.id} className="border bg-muted/30 opacity-70">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm">{student.profiles.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{student.profiles.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoringId === student.id}
                    onClick={() => onRestoreStudent(student.id)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {restoringId === student.id ? "Geri alınıyor..." : "Geri Al"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
