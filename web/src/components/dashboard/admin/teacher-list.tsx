"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Badge } from "@/components/panel-ui/badge";
import { Users, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Teacher } from "@/lib/admin/types";

interface TeacherListProps {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
  onSelectTeacher: (teacher: Teacher) => void;
  onCreateTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
}

export function TeacherList({ teachers, selectedTeacher, onSelectTeacher, onCreateTeacher, onEditTeacher }: TeacherListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Öğretmenler
            </CardTitle>
            <CardDescription>{teachers.length} öğretmen kayıtlı</CardDescription>
          </div>
          <Button onClick={onCreateTeacher} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Oluştur
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz öğretmen yok.</p>
        ) : (
          teachers.map((teacher) => (
            <Card
              key={teacher.user_id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent",
                selectedTeacher?.user_id === teacher.user_id && "ring-2 ring-ring",
              )}
              onClick={() => onSelectTeacher(teacher)}
            >
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium">{teacher.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  <Badge variant="outline" className="mt-1">
                    {teacher.students.filter((s) => !s.is_archived).length} öğrenci
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Öğretmen ayarları"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTeacher(teacher);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
