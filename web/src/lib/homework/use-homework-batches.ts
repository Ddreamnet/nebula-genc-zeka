"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface HomeworkFile {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
}

export interface HomeworkBatch {
  batch_id: string;
  title: string;
  description: string | null;
  created_at: string;
  uploaded_by_user_id: string;
  student_id: string;
  files: HomeworkFile[];
}

export interface PreviewState {
  url: string;
  type: "image" | "pdf";
}

/** Bir dosya tarayıcıda gösterilebilir mi — yalnızca görsel ve PDF. */
export function isPreviewable(fileType: string): boolean {
  return fileType.startsWith("image/") || fileType === "application/pdf";
}

/** Public URL'den bucket içi yolu çıkarır. Yol çözülemezse null. */
function toStoragePath(fileUrl: string): string | null {
  const parts = fileUrl.split("/homework-files/");
  if (parts.length < 2 || !parts[1]) return null;
  return decodeURIComponent(parts[1]);
}

/**
 * `homework_submissions` satırlarını `batch_id` ile gruplayıp okur ve dosya
 * eylemlerini (önizleme, indirme, silme) sağlar.
 *
 * ŞEMADA DURUM (status), TESLİM TARİHİ (due_date) VE TASLAK ALANI YOK. Bir
 * satır bu yüzden "teslim edildi / bekliyor" diyemez; taşıdığı tek durum
 * `uploaded_by_user_id` — dosyayı öğrenci mi öğretmen mi yükledi. Arayüz de
 * yalnızca bu ayrımı gösterir. Uydurulmuş bir "bekliyor" rozeti veriyle
 * desteklenmeyen bir söz verirdi.
 *
 * Bucket PRIVATE: dosyalar `<img src>` ile doğrudan gösterilemez, oturumla
 * indirilip blob URL'e çevrilir. Blob URL'leri sızdırmamak için önizleme
 * kapanınca serbest bırakılır.
 */
export function useHomeworkBatches(studentId: string, teacherId: string, enabled = true) {
  const [batches, setBatches] = useState<HomeworkBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const refetch = useCallback(async () => {
    if (!studentId || !teacherId) {
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("id, student_id, title, description, file_url, file_type, file_name, created_at, uploaded_by_user_id, batch_id")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Ödevler yüklenemedi");
      setLoading(false);
      return;
    }

    const grouped = new Map<string, HomeworkBatch>();
    for (const row of data ?? []) {
      let batch = grouped.get(row.batch_id);
      if (!batch) {
        batch = {
          batch_id: row.batch_id,
          title: row.title,
          description: row.description,
          created_at: row.created_at,
          uploaded_by_user_id: row.uploaded_by_user_id,
          student_id: row.student_id,
          files: [],
        };
        grouped.set(row.batch_id, batch);
      }
      batch.files.push({ id: row.id, file_url: row.file_url, file_type: row.file_type, file_name: row.file_name });
    }

    setBatches([...grouped.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setLoading(false);
  }, [studentId, teacherId]);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  // Önizleme açıkken sayfa kaydırması kilitlenir ve kapanınca blob serbest
  // bırakılır. Serbest bırakma 100ms geciktirilir: <img>/<iframe> kaynağını
  // hâlâ okuyorken URL'i iptal etmek Safari'de boş bir kare bırakıyordu.
  useEffect(() => {
    if (!preview) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [preview]);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current?.url) {
        const url = current.url;
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      return null;
    });
  }, []);

  const openPreview = useCallback(async (fileUrl: string, fileType: string) => {
    const path = toStoragePath(fileUrl);
    if (!path) {
      toast.error("Dosya yolu çözümlenemedi");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("homework-files").download(path);
    if (error || !data) {
      toast.error("Dosya yüklenemedi");
      return;
    }
    const objectUrl = URL.createObjectURL(data);
    setPreview({ url: objectUrl, type: fileType.startsWith("image/") ? "image" : "pdf" });
  }, []);

  const download = useCallback(async (fileUrl: string, fileName: string) => {
    const path = toStoragePath(fileUrl);
    if (!path) {
      toast.error("Dosya hazırlanamadı");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("homework-files").download(path);
    if (error || !data) {
      toast.error("Dosya hazırlanamadı");
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const remove = useCallback(
    async (batchId: string) => {
      const batch = batches.find((b) => b.batch_id === batchId);
      if (!batch) return;
      const supabase = createClient();
      try {
        const paths = batch.files.map((f) => toStoragePath(f.file_url)).filter((p): p is string => !!p);
        if (paths.length > 0) await supabase.storage.from("homework-files").remove(paths);
        const { error } = await supabase.from("homework_submissions").delete().eq("batch_id", batchId);
        if (error) throw error;
        toast.success("Ödev silindi");
        await refetch();
      } catch {
        toast.error("Ödev silinemedi");
      }
    },
    [batches, refetch],
  );

  return { batches, loading, refetch, preview, openPreview, closePreview, download, remove };
}
