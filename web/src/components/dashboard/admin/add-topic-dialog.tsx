"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Konu Ekle</DialogTitle>
          <DialogDescription>Öğrenci için yeni bir öğrenme konusu oluşturun. Daha sonra kaynak ekleyebilirsiniz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konu Oluştur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
