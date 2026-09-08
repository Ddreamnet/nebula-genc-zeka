"use client";

import { useState } from "react";
import { Download, Eye, FileText, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ConfirmSheet } from "@/components/panel-ui/sheet";
import { useAsyncAction } from "@/lib/use-async-action";
import { isPreviewable, type HomeworkBatch, type PreviewState } from "@/lib/homework/use-homework-batches";
import { cn } from "@/lib/cn";

/**
 * Ödev partileri listesi.
 *
 * Sol şerit rengi tek bir soruyu cevaplar: kim yükledi. Pembe = öğrenci,
 * mavi = öğretmen. Aynı renk başlıktaki sayı çiftlerinde de kullanılır, bu
 * yüzden rozete bakmadan da anlaşılır — rozet yalnızca rengi göremeyen için
 * var.
 *
 * "Teslim edildi / bekliyor" YOK: şemada durum alanı yok (bkz.
 * use-homework-batches). Veriyle desteklenmeyen bir rozet, öğretmenin
 * güvendiği ama yanlış olan bir bilgi olurdu.
 */
export function HomeworkBatchList({
  batches,
  loading,
  currentUserId,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  emptyText = "Henüz ödev yok.",
}: {
  batches: HomeworkBatch[];
  loading: boolean;
  currentUserId: string;
  onPreview: (fileUrl: string, fileType: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
  onDelete?: (batchId: string) => Promise<void>;
  onEdit?: (batch: HomeworkBatch) => void;
  emptyText?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  /** Which batch the "sil" question is about; one sheet serves every row. */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [runDelete, deleting] = useAsyncAction(async (batchId: string) => {
    await onDelete?.(batchId);
    setConfirmId(null);
  });
  const confirmBatch = batches.find((b) => b.batch_id === confirmId) ?? null;

  if (loading) {
    return (
      <>
        <div className="h-16 animate-pulse rounded-[12px] bg-[color:var(--pn-peach-tint)]" />
        <div className="h-16 animate-pulse rounded-[12px] bg-[color:var(--pn-peach-tint)] opacity-60" />
      </>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
        <FileText className="size-8 text-outline" strokeWidth={1.5} aria-hidden />
        <p className="text-[13px] text-on-surface-variant">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {batches.map((batch) => {
        const fromStudent = batch.uploaded_by_user_id === batch.student_id;
        const stripe = fromStudent ? "var(--pn-pink-ink)" : "var(--pn-blue-ink)";
        const chip = fromStudent ? "var(--pn-pink)" : "var(--pn-blue)";
        const ink = fromStudent ? "var(--pn-pink-ink-strong)" : "var(--pn-blue-ink-strong)";
        const isOpen = open === batch.batch_id;

        return (
          <div
            key={batch.batch_id}
            className="rounded-[12px] border border-l-[3px]"
            style={{
              background: fromStudent ? "var(--pn-pink-sel)" : "var(--pn-blue-sel)",
              borderColor: fromStudent ? "var(--pn-pink-line)" : "var(--pn-blue-line)",
              borderLeftColor: stripe,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : batch.batch_id)}
              aria-expanded={isOpen}
              className="flex w-full flex-col gap-1.5 p-2 text-left"
            >
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-on-surface">{batch.title}</span>
                <span className="pn-tag shrink-0" style={{ background: chip, color: ink }}>
                  {fromStudent ? "Öğrenci" : "Öğretmen"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="pn-chip pn-chip--quiet">
                  <Paperclip className="size-2.5" strokeWidth={2} aria-hidden />
                  {batch.files.length}
                </span>
                <span className="flex-1" />
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-on-surface-variant">
                  {format(new Date(batch.created_at), "dd MMM", { locale: tr })}
                </span>
              </div>
            </button>

            <div className="pn-expand" data-open={isOpen} inert={!isOpen}>
              <div>
              <div className="flex flex-col gap-1 border-t border-[color:var(--pn-hair)] p-2">
                {batch.description && (
                  <p className="px-1.5 pb-1 text-[12px] leading-relaxed text-on-surface-variant">{batch.description}</p>
                )}
                {batch.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 rounded-[10px] bg-surface-container p-1.5">
                    <FileText className="size-3.5 shrink-0 text-outline" strokeWidth={1.8} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-on-surface" title={file.file_name}>
                      {file.file_name}
                    </span>
                    {isPreviewable(file.file_type) && (
                      <IconAction label="Görüntüle" onClick={() => onPreview(file.file_url, file.file_type)}>
                        <Eye className="size-3.5" strokeWidth={1.9} aria-hidden />
                      </IconAction>
                    )}
                    <IconAction label="İndir" onClick={() => onDownload(file.file_url, file.file_name)}>
                      <Download className="size-3.5" strokeWidth={1.9} aria-hidden />
                    </IconAction>
                  </div>
                ))}

                {batch.uploaded_by_user_id === currentUserId && (onEdit || onDelete) && (
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {onEdit && (
                      <button type="button" className="pn-btn pn-btn--sm pn-btn--paper" onClick={() => onEdit(batch)}>
                        <Pencil className="size-3.5" strokeWidth={1.9} aria-hidden />
                        Düzenle
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" className="pn-btn pn-btn--sm pn-btn--pink" onClick={() => setConfirmId(batch.batch_id)}>
                        <Trash2 className="size-3.5" strokeWidth={1.9} aria-hidden />
                        Sil
                      </button>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        );
      })}
      <ConfirmSheet
        open={!!confirmBatch}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Ödevi sil"
        description={confirmBatch ? `Bu ödev ve içindeki ${confirmBatch.files.length} dosya kalıcı olarak silinecek. Geri alınamaz.` : undefined}
        confirmLabel={deleting ? "Siliniyor…" : "Sil"}
        loading={deleting}
        onConfirm={() => {
          if (confirmBatch) void runDelete(confirmBatch.batch_id);
        }}
      />
    </>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-[color:var(--pn-hair)] bg-surface-low text-on-surface-variant transition-colors duration-[.16s] hover:bg-[color:var(--pn-blue-tint)] hover:text-[color:var(--pn-blue-ink)] pointer-fine:size-7"
    >
      {children}
    </button>
  );
}

/**
 * Tam ekran dosya önizlemesi.
 *
 * Kaynak blob: URL — PRIVATE bir bucket'tan oturumla indirilmiş bir dosya.
 * next/image optimizer üzerinden geçer, optimizer'ın oturumu yoktur ve bu
 * sekmenin blob'unu zaten göremez; bu yüzden düz <img> kullanılır.
 *
 * Kapatma düğmesi üstte SAĞDA ve `env(safe-area-inset-top)` kadar aşağıda:
 * çentikli bir iPhone'da tam üste konursa durum çubuğunun altında kalıyordu.
 */
export function FilePreviewOverlay({ preview, onClose }: { preview: PreviewState | null; onClose: () => void }) {
  if (!preview) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95" role="dialog" aria-label="Dosya önizleme">
      <button
        type="button"
        onClick={onClose}
        aria-label="Önizlemeyi kapat"
        className="absolute right-4 z-10 grid size-12 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <X className="size-6" strokeWidth={2} aria-hidden />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview.type === "image" && <img src={preview.url} alt="Ödev önizlemesi" className="max-h-full max-w-full object-contain p-4" />}
      {preview.type === "pdf" && <iframe src={preview.url} title="PDF önizleme" className={cn("h-full w-full border-0")} />}
    </div>
  );
}
