"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Textarea } from "@/components/panel-ui/textarea";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EditHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  currentTitle: string;
  currentDescription: string | null;
  onSuccess?: () => void;
}

export function EditHomeworkDialog({ open, onOpenChange, batchId, currentTitle, currentDescription, onSuccess }: EditHomeworkDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setTitle(currentTitle);
    setDescription(currentDescription ?? "");
  }, [currentTitle, currentDescription, open]);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Ödev başlığı zorunludur");
      return;
    }

    setUpdating(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from("homework_submissions").update({ title: title.trim(), description: description.trim() || null }).eq("batch_id", batchId);
      if (error) throw error;

      toast.success("Ödev güncellendi");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ödev güncellenemedi");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ödevi Düzenle</DialogTitle>
          <DialogDescription>Ödev başlığını ve açıklamasını güncelleyin</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-hw-title">Ödev Başlığı *</Label>
            <Input id="edit-hw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: İngilizce Kompozisyon" disabled={updating} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-hw-description">Açıklama</Label>
            <Textarea id="edit-hw-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ödev hakkında ek bilgiler..." rows={3} disabled={updating} className="max-h-[120px] overflow-y-auto" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={updating}>
            {updating ? (
              "Güncelleniyor..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
