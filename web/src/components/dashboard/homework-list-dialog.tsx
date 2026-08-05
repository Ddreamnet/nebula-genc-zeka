"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Card, CardContent } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Badge } from "@/components/panel-ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/panel-ui/alert-dialog";
import { FileText, Calendar, FileImage, File, Edit2, Trash2, Eye, Download, X } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { EditHomeworkDialog } from "./edit-homework-dialog";

interface HomeworkListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  currentUserId: string;
}

interface Homework {
  id: string;
  student_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  created_at: string;
  uploaded_by_user_id: string;
  batch_id: string;
}

interface GroupedHomework {
  batch_id: string;
  title: string;
  description: string | null;
  created_at: string;
  uploaded_by_user_id: string;
  student_id: string;
  files: { id: string; file_url: string; file_type: string; file_name: string }[];
}

interface PreviewState {
  url: string;
  type: "image" | "pdf";
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <FileImage className="h-5 w-5" />;
  if (fileType === "application/pdf") return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
}

function isPreviewable(fileType: string) {
  return fileType.startsWith("image/") || fileType === "application/pdf";
}

export function HomeworkListDialog({ open, onOpenChange, studentId, teacherId, currentUserId }: HomeworkListDialogProps) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [groupedHomeworks, setGroupedHomeworks] = useState<GroupedHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [editHomework, setEditHomework] = useState<Homework | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const fetchHomeworks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("*")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Ödevler yüklenemedi");
      setLoading(false);
      return;
    }

    setHomeworks(data ?? []);

    const grouped: Record<string, GroupedHomework> = {};
    (data ?? []).forEach((hw) => {
      if (!grouped[hw.batch_id]) {
        grouped[hw.batch_id] = {
          batch_id: hw.batch_id,
          title: hw.title,
          description: hw.description,
          created_at: hw.created_at,
          uploaded_by_user_id: hw.uploaded_by_user_id,
          student_id: hw.student_id,
          files: [],
        };
      }
      grouped[hw.batch_id].files.push({ id: hw.id, file_url: hw.file_url, file_type: hw.file_type, file_name: hw.file_name });
    });

    setGroupedHomeworks(Object.values(grouped).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }, [studentId, teacherId]);

  useEffect(() => {
    if (open) fetchHomeworks();
  }, [open, fetchHomeworks]);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  useEffect(() => {
    if (preview) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [preview]);

  async function handlePreview(fileUrl: string, fileType: string) {
    const urlParts = fileUrl.split("/homework-files/");
    if (urlParts.length < 2 || !urlParts[1]) {
      toast.error("Dosya yolu çözümlenemedi");
      return;
    }
    const filePath = decodeURIComponent(urlParts[1]);

    const supabase = createClient();
    const { data, error } = await supabase.storage.from("homework-files").download(filePath);
    if (error || !data) {
      toast.error("Dosya yüklenemedi");
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    if (fileType.startsWith("image/")) {
      setPreview({ url: objectUrl, type: "image" });
    } else if (fileType === "application/pdf") {
      setPreview({ url: objectUrl, type: "pdf" });
    }
  }

  const closePreview = useCallback(() => {
    setPreview((prev) => {
      if (prev?.url) {
        const u = prev.url;
        setTimeout(() => URL.revokeObjectURL(u), 100);
      }
      return null;
    });
  }, []);

  async function handleDownload(fileUrl: string, fileName: string) {
    const urlParts = fileUrl.split("/homework-files/");
    if (urlParts.length < 2) {
      toast.error("Dosya hazırlanamadı");
      return;
    }
    const filePath = decodeURIComponent(urlParts[1]);

    const supabase = createClient();
    const { data, error } = await supabase.storage.from("homework-files").download(filePath);
    if (error || !data) {
      toast.error("Dosya hazırlanamadı");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDelete(batchId: string) {
    const supabase = createClient();
    try {
      const batchHomeworks = homeworks.filter((h) => h.batch_id === batchId);
      const filePaths = batchHomeworks.map((h) => h.file_url.split("/homework-files/")[1]).filter(Boolean).map((p) => decodeURIComponent(p));

      if (filePaths.length > 0) {
        await supabase.storage.from("homework-files").remove(filePaths);
      }

      const { error } = await supabase.from("homework_submissions").delete().eq("batch_id", batchId);
      if (error) throw error;

      toast.success("Ödev silindi");
      await fetchHomeworks();
    } catch {
      toast.error("Ödev silinemedi");
    }
  }

  function canEdit(group: GroupedHomework) {
    return group.uploaded_by_user_id === currentUserId;
  }

  function isUploadedByStudent(group: GroupedHomework) {
    return group.uploaded_by_user_id === group.student_id;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Ödevler</DialogTitle>
            <DialogDescription>Tüm ödevleri görüntüleyin</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : groupedHomeworks.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Henüz ödev yok</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pr-1">
                {groupedHomeworks.map((group) => {
                  const uploadedByStudent = isUploadedByStudent(group);
                  const cardColorClass = uploadedByStudent ? "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20" : "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";

                  return (
                    <Card key={group.batch_id} className={cardColorClass}>
                      <CardContent className="p-3 sm:p-4 relative pb-10">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-medium text-sm mb-1 break-words">{group.title}</h4>
                            {group.description && <p className="text-sm text-muted-foreground mb-2 break-words">{group.description}</p>}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                {format(new Date(group.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canEdit(group) && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Düzenle"
                                  onClick={() => {
                                    const firstFile = homeworks.find((h) => h.batch_id === group.batch_id);
                                    if (firstFile) setEditHomework(firstFile);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" aria-label="Sil" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                      <AlertDialogDescription>Bu ödevi ve tüm dosyalarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(group.batch_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Sil
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 overflow-hidden">
                          {group.files.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 bg-background/50 p-2 rounded border overflow-hidden">
                              <div className="flex-shrink-0">{getFileIcon(file.file_type)}</div>
                              <span className="text-xs sm:text-sm flex-1 truncate min-w-0" title={file.file_name}>
                                {file.file_name}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isPreviewable(file.file_type) && (
                                  <Button variant="ghost" size="sm" onClick={() => handlePreview(file.file_url, file.file_type)} aria-label="Görüntüle" className="h-8 w-8 p-0">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file.file_url, file.file_name)} aria-label="İndir" className="h-8 w-8 p-0">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Badge
                          variant="outline"
                          className={`absolute bottom-2 right-2 text-xs ${uploadedByStudent ? "text-red-700 border-red-300 dark:text-red-400 dark:border-red-800" : "text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-800"}`}
                        >
                          {uploadedByStudent ? "Öğrenci" : "Öğretmen"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(isOpen) => !isOpen && closePreview()}>
        <DialogContent
          className="fixed inset-0 w-screen h-screen max-w-none max-h-none translate-x-0 translate-y-0 left-0 top-0 p-0 border-0 rounded-none bg-black/95 z-[200]"
          style={{ transform: "none" }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Dosya Önizleme</DialogTitle>
          <DialogDescription className="sr-only">Dosya önizleme görünümü</DialogDescription>

          <button
            type="button"
            className="absolute top-10 right-4 z-[210] w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-white/20 active:bg-white/30 transition-colors"
            onClick={closePreview}
            aria-label="Kapat"
          >
            <X className="h-7 w-7" />
          </button>

          <div className="w-full h-full flex items-center justify-center">
            {preview?.type === "image" && <img src={preview.url} className="max-w-full max-h-full object-contain p-4" alt="Preview" />}
            {preview?.type === "pdf" && <iframe src={preview.url} className="w-full h-full border-0" title="PDF Preview" style={{ pointerEvents: "auto" }} />}
          </div>
        </DialogContent>
      </Dialog>

      {editHomework && (
        <EditHomeworkDialog
          open={!!editHomework}
          onOpenChange={(open) => !open && setEditHomework(null)}
          batchId={editHomework.batch_id}
          currentTitle={editHomework.title}
          currentDescription={editHomework.description}
          onSuccess={fetchHomeworks}
        />
      )}
    </>
  );
}
