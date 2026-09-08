"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { SideDrawer } from "@/components/panel-shell/side-drawer";
import { useHomeworkBatches, type HomeworkBatch } from "@/lib/homework/use-homework-batches";
import { HomeworkBatchList, FilePreviewOverlay } from "../homework/homework-batches";
import { UploadHomeworkDialog } from "../upload-homework-dialog";
import { EditHomeworkDialog } from "../edit-homework-dialog";
import { cn } from "@/lib/cn";

interface Member {
  id: string;
  student_id: string;
  profiles: { full_name: string };
}

/**
 * Ödevler yan paneli.
 *
 * Ödevler bir YER değil, seçili öğrencinin yanındaki bir EYLEMDİR — bu yüzden
 * navigasyonda değil, "şu an derste" şeridindeki düğmenin ardında. Panel
 * açılınca konular kartını sıkıştırır, üstünü kapatmaz: öğretmen ödevi
 * verirken hangi konuda olduğunu görmeye devam eder.
 */
export function HomeworkDrawer({
  open,
  onClose,
  members,
  teacherId,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  teacherId: string;
}) {
  const [memberIndex, setMemberIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkBatch | null>(null);

  // İndeks bir effect'le sıfırlanmaz, KIRPILIR: iki kişilik bir gruptan tek
  // kişilik bir satıra geçildiğinde indeks 1 aralık dışına düşer ve buradaki
  // clamp onu anında geçerli kılar. Effect ile sıfırlamak aynı sonucu bir
  // render turu geç verirdi — arada bir kare boş panel görünürdü.
  const activeIndex = Math.min(memberIndex, Math.max(members.length - 1, 0));
  const active = members[activeIndex];
  const { batches, loading, refetch, preview, openPreview, closePreview, download, remove } = useHomeworkBatches(
    active?.student_id ?? "",
    teacherId,
    open,
  );

  if (!open || !active) return null;

  const fromStudent = batches.filter((b) => b.uploaded_by_user_id === b.student_id).length;
  const fromTeacher = batches.length - fromStudent;

  return (
    <>
      <SideDrawer
        open={open}
        onClose={onClose}
        tone="peach"
        title="Ödevler"
        subtitle={`${active.profiles.full_name} · ${batches.length} ödev`}
        meta={
          <>
            {/* Sayıların toplamı başlıktaki toplama eşittir — iki rozet aynı
                kümeyi bölüyor, farklı iki kümeyi değil. */}
            <span className="pn-chip pn-chip--pink">
              {fromStudent} <span className="font-sans">öğrenciden</span>
            </span>
            <span className="pn-chip pn-chip--blue">
              {fromTeacher} <span className="font-sans">öğretmenden</span>
            </span>
          </>
        }
        footer={
          <button type="button" className="pn-btn pn-btn--peach w-full" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" strokeWidth={1.9} aria-hidden />
            Dosya yükle
          </button>
        }
      >
        {members.length > 1 && (
          <div className="mb-1 flex items-center gap-1 rounded-full border border-[color:var(--pn-hair)] bg-surface-low p-1">
            {members.map((member, index) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setMemberIndex(index)}
                aria-pressed={index === activeIndex}
                className={cn(
                  "min-h-9 flex-1 truncate rounded-full px-2.5 text-[12px] font-semibold transition-colors duration-[.16s] pointer-fine:min-h-7",
                  index === activeIndex
                    ? "bg-[color:var(--pn-peach)] text-[color:var(--pn-peach-ink-strong)]"
                    : "text-on-surface-variant",
                )}
              >
                {member.profiles.full_name}
              </button>
            ))}
          </div>
        )}

        <HomeworkBatchList
          batches={batches}
          loading={loading}
          currentUserId={teacherId}
          onPreview={openPreview}
          onDownload={download}
          onDelete={remove}
          onEdit={setEditing}
          emptyText="Bu öğrenci için henüz ödev yok."
        />
      </SideDrawer>

      <FilePreviewOverlay preview={preview} onClose={closePreview} />

      <UploadHomeworkDialog
        open={uploadOpen}
        onOpenChange={(value) => {
          setUploadOpen(value);
          if (!value) refetch();
        }}
        studentId={active.student_id}
        teacherId={teacherId}
        uploadedByUserId={teacherId}
      />

      {editing && (
        <EditHomeworkDialog
          open
          onOpenChange={(value) => !value && setEditing(null)}
          batchId={editing.batch_id}
          currentTitle={editing.title}
          currentDescription={editing.description}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
