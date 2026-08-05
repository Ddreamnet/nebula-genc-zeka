"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Textarea } from "@/components/panel-ui/textarea";
import { Badge } from "@/components/panel-ui/badge";
import { Card } from "@/components/panel-ui/card";
import { BlogPostEditor } from "./blog-post-editor";
import { Plus, Pencil, Trash2, Eye, ArrowLeft, Image as ImageIcon } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
}

interface BlogManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "list" | "edit";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function BlogManager({ open, onOpenChange }: BlogManagerProps) {
  const [view, setView] = useState<View>("list");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Blog yazıları yüklenemedi");
    } else {
      setPosts(data ?? []);
    }
    setLoading(false);
  }, []);

  // Fetched once per mount, not on every open — reopening after it's already
  // loaded shouldn't refetch/flash a spinner. Mutations already call
  // fetchPosts() directly afterward, so the list stays correct.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      fetchPosts();
    }
  }, [open, fetchPosts]);

  function resetForm() {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setCoverImageUrl("");
    setSlugManual(false);
    setEditingPost(null);
  }

  function startNew() {
    resetForm();
    setView("edit");
  }

  function startEdit(post: BlogPost) {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? "");
    setContent(post.content ?? "");
    setCoverImageUrl(post.cover_image_url ?? "");
    setSlugManual(true);
    setView("edit");
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(generateSlug(val));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // The `accept="image/*"` on the <input> is a UI hint only — the storage
    // bucket itself enforces no type/size limit, so this is the only check.
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Görsel boyutu en fazla 10MB olabilir");
      e.target.value = "";
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("blog-media").upload(path, file);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
    setCoverImageUrl(data.publicUrl);
  }

  async function save(status: "draft" | "published") {
    if (!title.trim() || !slug.trim()) {
      toast.error("Başlık ve slug zorunludur");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content: content || null,
      cover_image_url: coverImageUrl || null,
      status,
      published_at: status === "published" ? (editingPost?.published_at ?? new Date().toISOString()) : null,
    };

    setSaving(true);
    const supabase = createClient();
    const { error } = editingPost?.id
      ? await supabase.from("blog_posts").update(payload).eq("id", editingPost.id)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingPost?.id ? "Blog yazısı güncellendi" : "Blog yazısı oluşturuldu");
    setView("list");
    resetForm();
    await fetchPosts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu yazıyı silmek istediğinize emin misiniz?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Blog yazısı silindi");
    await fetchPosts();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setView("list");
          resetForm();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100%-1rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "edit" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setView("list");
                  resetForm();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {view === "list" ? "Blog Yönetimi" : editingPost?.id ? "Yazıyı Düzenle" : "Yeni Yazı"}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <div className="space-y-4">
            <Button onClick={startNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Yeni Yazı
            </Button>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Henüz blog yazısı yok.</p>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <Card key={post.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{post.title}</span>
                        <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-xs shrink-0">
                          {post.status === "published" ? "Yayında" : "Taslak"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">/{post.slug}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {post.status === "published" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Yazıyı düzenle" onClick={() => startEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label="Yazıyı sil"
                        onClick={() => handleDelete(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "edit" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blog-title">Başlık *</Label>
                <Input id="blog-title" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Blog yazısı başlığı" />
              </div>
              <div>
                <Label htmlFor="blog-slug">Slug *</Label>
                <Input
                  id="blog-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManual(true);
                  }}
                  placeholder="url-friendly-slug"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="blog-excerpt">Kısa Özet</Label>
              <Textarea id="blog-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Blog yazısının kısa özeti..." rows={2} />
            </div>

            <div>
              <Label>Kapak Görseli</Label>
              <div className="flex items-center gap-3 mt-1">
                {coverImageUrl && <img src={coverImageUrl} alt="Kapak" className="h-20 w-32 object-cover rounded-md border" />}
                <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" /> {coverImageUrl ? "Değiştir" : "Yükle"}
                </Button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </div>
            </div>

            <div>
              <Label>İçerik</Label>
              <div className="mt-1">
                <BlogPostEditor content={content} onChange={setContent} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button onClick={() => save("draft")} variant="outline" disabled={saving}>
                Taslak Kaydet
              </Button>
              <Button onClick={() => save("published")} disabled={saving}>
                {editingPost?.status === "published" ? "Güncelle" : "Yayınla"}
              </Button>
              {editingPost?.id && editingPost.status === "published" && (
                <Button onClick={() => save("draft")} variant="secondary" disabled={saving}>
                  Yayından Kaldır
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
