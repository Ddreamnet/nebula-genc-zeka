"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/panel-ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DAYS_OF_WEEK, type StudentLessonBase } from "@/lib/admin/types";
import { validateLessonSlots, generateTempPassword } from "@/lib/lesson/validate-slots";

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentCreated: () => void;
  teacherId: string;
}

export function CreateStudentDialog({ open, onOpenChange, onStudentCreated, teacherId }: CreateStudentDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);
  const [lessons, setLessons] = useState<StudentLessonBase[]>([{ dayOfWeek: 1, startTime: "", endTime: "" }]);
  const [loading, setLoading] = useState(false);

  // Stays mounted as long as a teacher is selected, independent of `open` —
  // without this, cancelling and reopening (even for a different teacher)
  // shows whatever was typed last time instead of a blank form.
  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setTempPassword("");
      setLessonsPerWeek(1);
      setLessons([{ dayOfWeek: 1, startTime: "", endTime: "" }]);
    }
  }, [open]);

  /** Deriving the slot list from the count belongs in the change handler, not
   *  in an effect reading `lessons` out of a suppressed dependency. */
  function handleLessonsPerWeekChange(count: number) {
    setLessonsPerWeek(count);
    setLessons((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      const next = [...prev];
      while (next.length < count) next.push({ dayOfWeek: 1, startTime: "", endTime: "" });
      return next;
    });
  }

  function updateLesson(index: number, field: keyof StudentLessonBase, value: string | number) {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !name || !tempPassword) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    // Same validator the edit dialog runs — and the same one the database now
    // enforces. Before this, only "is it empty?" was checked here, so a
    // reversed slot (15:00-14:00) sailed through and later billed the teacher
    // MINUS 60 minutes when the lesson was completed.
    const slotError = validateLessonSlots(lessons);
    if (slotError) {
      toast.error(slotError);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("create-student", {
        body: {
          email,
          name,
          password: tempPassword,
          teacherId,
          lessons: lessons.map((lesson) => ({
            day_of_week: lesson.dayOfWeek,
            start_time: lesson.startTime,
            end_time: lesson.endTime,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Öğrenci hesabı başarıyla oluşturuldu! Geçici şifre: ${tempPassword}`);
      setEmail("");
      setName("");
      setTempPassword("");
      setLessonsPerWeek(1);
      setLessons([{ dayOfWeek: 1, startTime: "", endTime: "" }]);
      onStudentCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğrenci hesabı oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  function generatePassword() {
    setTempPassword(generateTempPassword());
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" onDismiss={() => onOpenChange(false)}>
        <SheetHeader tone="blue" title="Öğrenci Hesabı Oluştur" subtitle="Hesap, geçici şifre ve ders programı" icon={<UserPlus className="size-5 shrink-0 text-[color:var(--pn-blue-ink)]" strokeWidth={1.9} aria-hidden />} />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Öğrenci E-postası</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ogrenci@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Öğrenci Adı"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Geçici Şifre</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Şifre oluştur veya gir"
                required
              />
              <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">
                Oluştur
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsPerWeek">Haftalık Ders Sayısı</Label>
            <Select value={lessonsPerWeek.toString()} onValueChange={(value) => handleLessonsPerWeekChange(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} ders
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Ders Programı</Label>
            {lessons.map((lesson, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg">
                <div className="space-y-2">
                  <Label>Gün</Label>
                  <Select
                    value={lesson.dayOfWeek.toString()}
                    onValueChange={(value) => updateLesson(index, "dayOfWeek", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Başlangıç</Label>
                  <Input
                    type="time"
                    value={lesson.startTime}
                    onChange={(e) => updateLesson(index, "startTime", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bitiş</Label>
                  <Input
                    type="time"
                    value={lesson.endTime}
                    onChange={(e) => updateLesson(index, "endTime", e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Not:</strong> Öğrenci bu geçici şifre ile oluşturulacak. Lütfen bu bilgileri öğrenci ile
              güvenli şekilde paylaşın.
            </p>
          </div>

          </SheetBody>
          <SheetFooter>
            <button type="button" className="pn-btn pn-btn--paper" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </button>
            <button type="submit" className="pn-btn pn-btn--blue" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Hesap Oluştur
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
