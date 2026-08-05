"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/panel-ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DAYS_OF_WEEK, type StudentLessonBase } from "@/lib/admin/types";

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

  useEffect(() => {
    if (lessonsPerWeek > lessons.length) {
      const newLessons = [...lessons];
      for (let i = lessons.length; i < lessonsPerWeek; i++) {
        newLessons.push({ dayOfWeek: 1, startTime: "", endTime: "" });
      }
      setLessons(newLessons);
    } else if (lessonsPerWeek < lessons.length) {
      setLessons(lessons.slice(0, lessonsPerWeek));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonsPerWeek]);

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
    if (!lessons.every((lesson) => lesson.dayOfWeek !== undefined && lesson.startTime && lesson.endTime)) {
      toast.error("Tüm ders programı alanlarını doldurun");
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
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(result);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Öğrenci Hesabı Oluştur
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Select value={lessonsPerWeek.toString()} onValueChange={(value) => setLessonsPerWeek(Number(value))}>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hesap Oluştur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
