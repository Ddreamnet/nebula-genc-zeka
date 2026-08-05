"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Textarea } from "@/components/panel-ui/textarea";
import { Upload, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UploadHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  uploadedByUserId?: string;
  onSuccess?: () => void;
}

const ACCEPTED_FILE_TYPES = "image/jpeg,image/jpg,image/png,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** The `accept` attribute on <input type="file"> is a UI hint only — the browser
 *  doesn't enforce it, so this actually validates what got selected/dropped. */
function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  return file.name.toLowerCase().endsWith(".docx");
}

export function UploadHomeworkDialog({ open, onOpenChange, studentId, teacherId, uploadedByUserId, onSuccess }: UploadHomeworkDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const validFiles: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} boyutu en fazla 10MB olabilir`);
          continue;
        }
        if (!isAcceptedFile(file)) {
          toast.error(`${file.name} desteklenmeyen bir dosya türü`);
          continue;
        }
        validFiles.push(file);
      }
      setFiles((prev) => [...prev, ...validFiles]);
    }
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Ödev başlığı zorunludur");
      return;
    }
    if (files.length === 0) {
      toast.error("Lütfen en az bir dosya seçin");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    try {
      const batchId = crypto.randomUUID();
      const uploaderId = uploadedByUserId || studentId;

      // Uploads run in parallel (previously fully sequential — a 5-file
      // batch locked the whole dialog for 5x as long). allSettled (not
      // Promise.all) so a single failed file doesn't abandon the others
      // mid-flight — we need every outcome to know exactly what to roll back.
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `${studentId}/${uploaderId}/${fileName}`;

          const { error: uploadError } = await supabase.storage.from("homework-files").upload(filePath, file);
          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("homework-files").getPublicUrl(filePath);

          return {
            filePath,
            submission: {
              batch_id: batchId,
              student_id: studentId,
              teacher_id: teacherId,
              title: title.trim(),
              description: description.trim() || null,
              file_url: publicUrl,
              file_type: file.type,
              file_name: file.name,
              uploaded_by_user_id: uploaderId,
            },
          };
        }),
      );

      const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      const failedCount = results.length - uploaded.length;

      if (failedCount > 0) {
        // Roll back whatever DID make it to Storage — a file with no
        // homework_submissions row is otherwise permanently orphaned and
        // invisible to the UI.
        if (uploaded.length > 0) {
          await supabase.storage.from("homework-files").remove(uploaded.map((u) => u.filePath)).catch(() => {});
        }
        throw new Error(`${failedCount} dosya yüklenemedi, hiçbiri kaydedilmedi`);
      }

      const { error: insertError } = await supabase.from("homework_submissions").insert(uploaded.map((u) => u.submission));
      if (insertError) {
        await supabase.storage.from("homework-files").remove(uploaded.map((u) => u.filePath)).catch(() => {});
        throw insertError;
      }

      toast.success(`${files.length} dosya başarıyla yüklendi`);
      setTitle("");
      setDescription("");
      setFiles([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ödev yüklenemedi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ödev Yükle</DialogTitle>
          <DialogDescription>Ödevinizi başlık, açıklama ve dosya ile yükleyin</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hw-title">Ödev Başlığı *</Label>
            <Input id="hw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: İngilizce Kompozisyon" disabled={uploading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hw-description">Açıklama</Label>
            <Textarea id="hw-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ödev hakkında ek bilgiler..." rows={3} disabled={uploading} className="max-h-[120px] overflow-y-auto" />
          </div>

          <div className="space-y-2">
            <Label>Dosyalar *</Label>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileChange} disabled={uploading} multiple className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Dosya Seç
            </Button>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded min-w-0">
                    <span className="flex-1 truncate min-w-0">{file.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(index)} disabled={uploading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Desteklenen formatlar: JPG, PNG, WEBP, PDF, DOCX (Maks. 10MB)</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? (
              "Yükleniyor..."
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Yükle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
