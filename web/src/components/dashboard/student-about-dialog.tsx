"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Separator } from "@/components/panel-ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo, Heading1, Heading2, Heading3, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

interface StudentAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  aboutText: string | null;
  isReadOnly?: boolean;
  onSaved?: () => void;
}

const COLORS = [
  { name: "Varsayılan", value: "inherit" },
  { name: "Kırmızı", value: "#ef4444" },
  { name: "Turuncu", value: "#f97316" },
  { name: "Sarı", value: "#eab308" },
  { name: "Yeşil", value: "#22c55e" },
  { name: "Mavi", value: "#3b82f6" },
  { name: "Mor", value: "#8b5cf6" },
  { name: "Pembe", value: "#ec4899" },
  { name: "Gri", value: "#6b7280" },
];

function ToolToggle({ pressed, onClick, title, children }: { pressed: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <Button type="button" variant={pressed ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={onClick} title={title} aria-label={title}>
      {children}
    </Button>
  );
}

export function StudentAboutDialog({ open, onOpenChange, studentId, studentName, aboutText, isReadOnly = false, onSaved }: StudentAboutDialogProps) {
  const [saving, setSaving] = useState(false);
  const [currentAboutText, setCurrentAboutText] = useState<string | null>(aboutText);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !studentId) return;
    // Guards against closing dialog for student A and opening it for
    // student B before A's fetch resolves — without this, A's about_text
    // could land in state after studentId has already moved on to B.
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("students")
      .select("about_text")
      .eq("student_id", studentId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setCurrentAboutText(data.about_text);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, studentId]);

  const contentInitializedRef = useRef(false);
  const lastOpenStateRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Underline, TextStyle, Color],
    content: "",
    editable: !isReadOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[150px] p-4 focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      const { $from } = editor.state.selection;
      const currentNode = $from.parent;
      if (currentNode.type.name === "heading" && currentNode.textContent === "") {
        editor.chain().setParagraph().run();
      }
    },
  });

  const lastStudentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (studentId !== lastStudentIdRef.current) {
      contentInitializedRef.current = false;
      setCurrentAboutText(null);
      lastStudentIdRef.current = studentId;
      editor?.commands.setContent("");
    }
  }, [studentId, editor]);

  useEffect(() => {
    if (!open && lastOpenStateRef.current) {
      contentInitializedRef.current = false;
    }
    lastOpenStateRef.current = open;
  }, [open]);

  useEffect(() => {
    if (editor && open && !loading && !contentInitializedRef.current) {
      editor.commands.setContent(currentAboutText || "");
      editor.setEditable(!isReadOnly);
      contentInitializedRef.current = true;
    }
  }, [currentAboutText, open, editor, isReadOnly, loading]);

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const htmlContent = editor.getHTML();
      const { error } = await supabase.from("students").update({ about_text: htmlContent === "<p></p>" ? null : htmlContent }).eq("student_id", studentId);
      if (error) throw error;

      toast.success("Bilgiler kaydedildi");
      await onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Kaydetme sırasında bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  function setColor(color: string) {
    if (color === "inherit") {
      editor?.chain().focus().unsetMark("textStyle").run();
    } else {
      editor?.chain().focus().setColor(color).run();
    }
  }

  if (!editor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{studentName} Hakkında</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 border rounded-t-lg bg-muted/30 border-b-0 overflow-x-auto">
              <ToolToggle pressed={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Başlık 1">
                <Heading1 className="h-4 w-4" />
              </ToolToggle>
              <ToolToggle pressed={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Başlık 2">
                <Heading2 className="h-4 w-4" />
              </ToolToggle>
              <ToolToggle pressed={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Başlık 3">
                <Heading3 className="h-4 w-4" />
              </ToolToggle>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <ToolToggle pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Kalın">
                <Bold className="h-4 w-4" />
              </ToolToggle>
              <ToolToggle pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="İtalik">
                <Italic className="h-4 w-4" />
              </ToolToggle>
              <ToolToggle pressed={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Altı çizili">
                <UnderlineIcon className="h-4 w-4" />
              </ToolToggle>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Yazı rengi">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-3 gap-1">
                    {COLORS.map((color) => (
                      <button key={color.value} onClick={() => setColor(color.value)} className={cn("flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors")} title={color.name}>
                        <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: color.value === "inherit" ? "transparent" : color.value }} />
                        <span className="text-xs">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <ToolToggle pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Madde listesi">
                <List className="h-4 w-4" />
              </ToolToggle>
              <ToolToggle pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numaralı liste">
                <ListOrdered className="h-4 w-4" />
              </ToolToggle>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="h-8 w-8 p-0" title="Geri al">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="h-8 w-8 p-0" title="İleri al">
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className={cn("border rounded-lg bg-background", !isReadOnly && "rounded-t-none border-t-0", isReadOnly && "bg-muted/20")}>
            {isReadOnly && (!aboutText || aboutText === "<p></p>") ? (
              <div className="min-h-[150px] p-4 flex items-center justify-center">
                <span className="text-muted-foreground italic">Henüz bilgi eklenmemiş</span>
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>

        {!isReadOnly && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
