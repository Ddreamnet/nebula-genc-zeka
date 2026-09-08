"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { Input } from "@/components/panel-ui/input";
import { Textarea } from "@/components/panel-ui/textarea";
import { Label } from "@/components/panel-ui/label";

interface EditTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditTopic: (id: string, title: string, description: string) => Promise<void>;
  topic: { id: string; title: string; description: string | null } | null;
}

export function EditTopicDialog({ open, onOpenChange, onEditTopic, topic }: EditTopicDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setDescription(topic.description ?? "");
    }
  }, [topic]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    try {
      await onEditTopic(topic.id, title, description);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onDismiss={() => onOpenChange(false)}>
        <SheetHeader tone="blue" title="Konuyu Düzenle" />
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
          <div>
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Konu başlığı" required />
          </div>
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Konu açıklaması (opsiyonel)" rows={3} />
          </div>
          </SheetBody>
          <SheetFooter>
            <button type="button" className="pn-btn pn-btn--paper" onClick={() => onOpenChange(false)}>
              İptal
            </button>
            <button type="submit" className="pn-btn pn-btn--blue" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
