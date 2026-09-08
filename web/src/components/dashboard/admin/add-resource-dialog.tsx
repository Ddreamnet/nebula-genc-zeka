"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Textarea } from "@/components/panel-ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/panel-ui/select";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, X } from "lucide-react";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string | null;
  topicTitle?: string;
  onAddResource: (title: string, description: string, resourceType: string, resourceUrl: string) => Promise<void>;
}

const resourceTypes = [
  { value: "pdf", label: "PDF Dökümanı" },
  { value: "video", label: "Video" },
  { value: "image", label: "Resim" },
  { value: "link", label: "Web Bağlantısı" },
  { value: "document", label: "Döküman" },
  { value: "other", label: "Diğer" },
];

function detectResourceType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) return "video";
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension || "")) return "image";
  if (["doc", "docx", "txt", "rtf", "pptx", "ppt"].includes(extension || "")) return "document";
  return "other";
}

export function AddResourceDialog({ open, onOpenChange, topicId, topicTitle, onAddResource }: AddResourceDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  function applySelectedFile(file: File) {
    setSelectedFile(file);
    setResourceType(detectResourceType(file.name));
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  // Plain function, not useCallback. It only ever lands on a <div onDrop>,
  // which memoizes nothing — and the [title] dependency was misleading on top
  // of that: it calls applySelectedFile, a declaration rebuilt every render,
  // so the memo could never actually be reused.
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file) applySelectedFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applySelectedFile(file);
  }

  async function uploadFile(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${topicId ?? "misc"}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("learning-resources").upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("learning-resources").getPublicUrl(fileName);
    return data.publicUrl;
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setResourceType("");
    setWebUrl("");
    setSelectedFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !resourceType || !topicId) return;

    if (resourceType === "link" && !webUrl.trim() && !selectedFile) {
      toast.error("Lütfen web bağlantısı için bir URL sağlayın");
      return;
    }
    if (resourceType !== "link" && !selectedFile) {
      toast.error("Lütfen bir dosya seçin");
      return;
    }

    setIsLoading(true);
    try {
      const resourceUrl = selectedFile ? await uploadFile(selectedFile) : webUrl.trim();
      await onAddResource(title.trim(), description.trim(), resourceType, resourceUrl);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onDismiss={() => onOpenChange(false)}>
        <SheetHeader tone="blue" title="Kaynak Ekle" subtitle={topicTitle ? `"${topicTitle}" konusuna — PDF, video, bağlantı ya da dosya` : "PDF, video, bağlantı ya da dosya"} />
        <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SheetBody className="w-full max-w-full space-y-4 overflow-x-hidden">
          <div className="space-y-2">
            <Label htmlFor="resource-title">Kaynak Başlığı</Label>
            <Input id="resource-title" placeholder="örn., Sebzeler Kelime Listesi" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-type">Kaynak Türü</Label>
            <Select value={resourceType} onValueChange={setResourceType} required>
              <SelectTrigger id="resource-type">
                <SelectValue placeholder="Kaynak türünü seçin" />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {resourceType === "link" && (
            <div className="space-y-2">
              <Label htmlFor="web-url">Web Bağlantısı URL</Label>
              <Input
                id="web-url"
                type="url"
                placeholder="https://example.com"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                required={resourceType === "link" && !selectedFile}
              />
            </div>
          )}

          {resourceType !== "link" && (
            <div className="space-y-2">
              <Label>Dosya Yükle</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors w-full max-w-full box-border ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate min-w-0">{selectedFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Dosyanızı buraya sürükleyip bırakın veya göz atmak için tıklayın</p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.mp4,.avi,.mov,.wmv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                      />
                      <Button type="button" variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
                        Dosya Seç
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resource-description">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="resource-description"
              placeholder="Bu kaynağın kısa açıklaması..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="max-h-[120px] overflow-y-auto"
            />
          </div>

          </SheetBody>
          <SheetFooter>
            <button type="button" className="pn-btn pn-btn--paper" onClick={() => onOpenChange(false)} disabled={isLoading}>
              İptal
            </button>
            <button
              type="submit"
              className="pn-btn pn-btn--blue"
              disabled={isLoading || !title.trim() || !resourceType || (!selectedFile && !(resourceType === "link" && webUrl.trim()))}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {resourceType === "link" && !selectedFile ? "Bağlantı Ekle" : "Kaynak Yükle"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
