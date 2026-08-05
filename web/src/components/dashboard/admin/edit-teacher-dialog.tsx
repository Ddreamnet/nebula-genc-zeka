"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Separator } from "@/components/panel-ui/separator";
import { Loader2, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { clearGlobalTopicsCache } from "@/lib/lesson/global-topics-cache";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/panel-ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/panel-ui/radio-group";

interface StudentRow {
  id: string;
  student_id: string;
  profiles: { user_id: string; full_name: string; email: string };
}

interface TeacherRow {
  user_id: string;
  full_name: string;
  email: string;
}

interface EditTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeacherUpdated: () => void;
  teacherId: string;
  currentName: string;
}

export function EditTeacherDialog({ open, onOpenChange, onTeacherUpdated, teacherId, currentName }: EditTeacherDialogProps) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(currentName);
      fetchStudents();
      fetchTeachers();
      setSelectedStudent("");
      setSelectedTeacher("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentName, teacherId]);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, student_id, profiles!students_student_id_fkey(user_id, full_name, email)")
        .eq("teacher_id", teacherId);
      if (error) throw error;
      setStudents(data ?? []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }

  async function fetchTeachers() {
    try {
      const { data: teacherRoles, error: rolesError } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      if (rolesError) throw rolesError;
      const ids = (teacherRoles ?? []).map((r) => r.user_id).filter((id) => id !== teacherId);
      if (ids.length === 0) {
        setTeachers([]);
        return;
      }
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      if (error) throw error;
      setTeachers(data ?? []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Öğretmen adı gereklidir");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("user_id", teacherId);
      if (error) throw error;
      toast.success("Öğretmen bilgileri güncellendi");
      onTeacherUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğretmen bilgileri güncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransferStudent() {
    if (!selectedStudent || !selectedTeacher) {
      toast.error("Lütfen bir öğrenci ve hedef öğretmen seçin");
      return;
    }

    setTransferLoading(true);
    try {
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) throw new Error("Öğrenci bulunamadı");

      const studentUserId = student.profiles.user_id;

      const { error: studentsError } = await supabase.from("students").update({ teacher_id: selectedTeacher }).eq("id", selectedStudent);
      if (studentsError) throw studentsError;

      // Independent of each other (and of the `students` row above, which is
      // why it's awaited first) — safe to run in parallel. Each result is
      // checked: previously these ran fire-and-forget, so a failure here
      // silently left a student's topics/lessons/tracking/homework/
      // notifications pointing at the OLD teacher while the toast still
      // claimed a clean transfer.
      const results = await Promise.all([
        supabase.from("topics").update({ teacher_id: selectedTeacher }).eq("student_id", studentUserId).eq("teacher_id", teacherId),
        supabase.from("student_lessons").update({ teacher_id: selectedTeacher }).eq("student_id", studentUserId).eq("teacher_id", teacherId),
        supabase
          .from("student_lesson_tracking")
          .update({ teacher_id: selectedTeacher })
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherId),
        supabase
          .from("homework_submissions")
          .update({ teacher_id: selectedTeacher })
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherId),
        supabase.from("notifications").update({ teacher_id: selectedTeacher }).eq("student_id", studentUserId).eq("teacher_id", teacherId),
      ]);
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        console.error(
          "handleTransferStudent: partial failure transferring related records:",
          failed.map((r) => r.error),
        );
        toast.error(
          `${student.profiles.full_name} yeni öğretmene atandı ama ${failed.length} ilişkili kayıt güncellenemedi — verileri kontrol edin.`,
        );
      } else {
        toast.success(`${student.profiles.full_name} adlı öğrenci yeni öğretmene atandı`);
      }
      fetchStudents();
      setSelectedStudent("");
      setSelectedTeacher("");
      onTeacherUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğrenci atanamadı");
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleDeleteTeacher() {
    setLoading(true);
    try {
      const { data: teacherStudents, error: studentsError } = await supabase.from("students").select("id").eq("teacher_id", teacherId);
      if (studentsError) throw studentsError;

      if (teacherStudents && teacherStudents.length > 0) {
        toast.error(`Bu öğretmenin ${teacherStudents.length} öğrencisi var. Öğretmeni silmeden önce öğrencileri başka bir öğretmene atayın veya silin.`);
        setLoading(false);
        return;
      }

      const { data: globalTopics, error: globalTopicsError } = await supabase.from("global_topics").select("id").eq("teacher_id", teacherId);
      if (globalTopicsError) throw globalTopicsError;
      if (globalTopics && globalTopics.length > 0) {
        const globalTopicIds = globalTopics.map((t) => t.id);
        const { error: resourcesDeleteError } = await supabase.from("global_topic_resources").delete().in("global_topic_id", globalTopicIds);
        if (resourcesDeleteError) throw resourcesDeleteError;
        const { error: topicsDeleteError } = await supabase.from("global_topics").delete().in("id", globalTopicIds);
        if (topicsDeleteError) throw topicsDeleteError;
        clearGlobalTopicsCache();
      }

      const { error: trialLessonsError } = await supabase.from("trial_lessons").delete().eq("teacher_id", teacherId);
      if (trialLessonsError) throw trialLessonsError;
      const { error: balanceError } = await supabase.from("teacher_balance").delete().eq("teacher_id", teacherId);
      if (balanceError) throw balanceError;
      const { error: paymentHistoryError } = await supabase.from("payment_history").delete().eq("teacher_id", teacherId);
      if (paymentHistoryError) throw paymentHistoryError;
      // Removing the user_roles row means they stop resolving as "teacher"
      // (a plain login would fall through resolveRole() to null and bounce
      // back to /giris). This does NOT delete the auth.users row itself —
      // that needs the admin API (service role), which the browser client
      // never has access to. A stray auth account with no profile/role is
      // the same residual limitation EWD's original delete had.
      const { error: roleError } = await supabase.from("user_roles").delete().eq("user_id", teacherId).eq("role", "teacher");
      if (roleError) throw roleError;
      const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", teacherId);
      if (profileError) throw profileError;

      toast.success("Öğretmen ve tüm verileri silindi");
      onTeacherUpdated();
      onOpenChange(false);
    } catch (error) {
      // Every step above now throws on its own failure instead of running
      // unchecked, so if this fires after the first couple of steps, some
      // deletes may already have committed — surface that rather than
      // implying nothing happened.
      toast.error(
        error instanceof Error
          ? `Silme işlemi yarıda kaldı: ${error.message}. Bazı veriler silinmiş olabilir, kontrol edin.`
          : "Öğretmen silinemedi",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Öğretmen Ayarları</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Öğretmen Adı</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" required />
          </div>

          <Separator className="my-4" />

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-base font-medium">Öğrenci Ataması</Label>
              <p className="text-sm text-muted-foreground">Bu öğretmene ait bir öğrenciyi başka bir öğretmene atayın</p>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Öğrenciler ({students.length})
                  <span className="text-xs text-muted-foreground">Tıklayın</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RadioGroup value={selectedStudent} onValueChange={setSelectedStudent}>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {students.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Bu öğretmene ait öğrenci yok</p>
                    ) : (
                      students.map((student) => (
                        <div key={student.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={student.id} id={student.id} />
                          <Label htmlFor={student.id} className="cursor-pointer flex-1">
                            {student.profiles.full_name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </RadioGroup>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Hedef Öğretmen ({teachers.length})
                  <span className="text-xs text-muted-foreground">Tıklayın</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RadioGroup value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {teachers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Başka öğretmen yok</p>
                    ) : (
                      teachers.map((teacher) => (
                        <div key={teacher.user_id} className="flex items-center space-x-2">
                          <RadioGroupItem value={teacher.user_id} id={teacher.user_id} />
                          <Label htmlFor={teacher.user_id} className="cursor-pointer flex-1">
                            {teacher.full_name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </RadioGroup>
              </CollapsibleContent>
            </Collapsible>

            <Button type="button" onClick={handleTransferStudent} disabled={!selectedStudent || !selectedTeacher || transferLoading} className="w-full">
              {transferLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserCheck className="h-4 w-4 mr-2" />
              Öğrenciyi Ata
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-base font-medium text-destructive">Tehlikeli Alan</Label>
              <p className="text-sm text-muted-foreground">Öğretmeni kalıcı olarak silmek için aşağıdaki butona tıklayın.</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const confirmed = window.confirm(
                  `${currentName} adlı öğretmeni silmek istediğinize emin misiniz? Bu öğretmenin öğrencilerinin başka bir öğretmene atandığından emin olun. Bu işlem geri alınamaz ve öğretmenin tüm verileri (global konular, deneme dersleri, bakiye bilgileri) silinecektir.`,
                );
                if (confirmed) handleDeleteTeacher();
              }}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Öğretmeni Sil
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
