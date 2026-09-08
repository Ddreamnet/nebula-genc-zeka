"use client";

import { useState } from "react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Textarea } from "@/components/panel-ui/textarea";
import { Checkbox } from "@/components/panel-ui/checkbox";
import { Loader2 } from "lucide-react";

interface AddTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTopic: (title: string, description: string, addToEnd?: boolean) => Promise<void>;
  /** Only global topics support choosing insertion position — per-student topics always append. */
  allowAddToEnd?: boolean;
}

export function AddTopicDialog({ open, onOpenChange, onAddTopic, allowAddToEnd }: AddTopicDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addToEnd, setAddToEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onAddTopic(title.trim(), description.trim(), addToEnd);
      setTitle("");
      setDescription("");
      setAddToEnd(false);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onDismiss={() => onOpenChange(false)}>
        <SheetHeader tone="blue" title="Yeni Konu Ekle" subtitle="Öğrenci için yeni bir konu. Kaynakları sonra eklersin." />
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic-title">Konu Başlığı</Label>
            <Input
              id="topic-title"
              placeholder="örn., Sebzeler, Meslekler, Günlük Rutinler"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic-description">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="topic-description"
              placeholder="Bu konunun ne içerdiğinin kısa açıklaması..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {allowAddToEnd && (
            <div className="flex items-center space-x-2">
              <Checkbox id="add-to-end" checked={addToEnd} onCheckedChange={(checked) => setAddToEnd(checked === true)} />
              <Label htmlFor="add-to-end" className="text-sm font-normal cursor-pointer">
                Sona ekle
              </Label>
            </div>
          )}
          </SheetBody>
          <SheetFooter>
            <button type="button" className="pn-btn pn-btn--paper" onClick={() => onOpenChange(false)} disabled={isLoading}>
              İptal
            </button>
            <button type="submit" className="pn-btn pn-btn--blue" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              Konu Oluştur
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
