"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Textarea } from "@/components/panel-ui/textarea";
import { Label } from "@/components/panel-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/panel-ui/select";

interface EditResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditResource: (id: string, title: string, description: string, resourceType: string, resourceUrl: string) => Promise<void>;
  resource: {
    id: string;
    title: string;
    description: string | null;
    resource_type: string;
    resource_url: string;
  } | null;
}

export function EditResourceDialog({ open, onOpenChange, onEditResource, resource }: EditResourceDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("link");
  const [resourceUrl, setResourceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description ?? "");
      setResourceType(resource.resource_type);
      setResourceUrl(resource.resource_url);
    }
  }, [resource]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resource) return;

    setLoading(true);
    try {
      await onEditResource(resource.id, title, description, resourceType, resourceUrl);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kaynağı Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kaynak başlığı" required />
          </div>
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kaynak açıklaması (opsiyonel)" rows={2} />
          </div>
          <div>
            <Label htmlFor="resourceType">Kaynak Türü</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger id="resourceType">
                <SelectValue placeholder="Kaynak türünü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Resim</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="document">Döküman</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="resourceUrl">Kaynak URL</Label>
            <Input id="resourceUrl" type="url" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
