"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CreateTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTeacherDialog({ open, onOpenChange, onSuccess }: CreateTeacherDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // This dialog is mounted for the whole admin dashboard's lifetime (not
  // conditionally, unlike the Edit dialogs) — without this, cancelling and
  // reopening shows whatever was typed last time instead of a blank form.
  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setPassword("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke("create-teacher", {
        body: { email, name: fullName, password },
      });

      if (response.error) throw new Error(response.error.message || "Öğretmen oluşturulamadı");
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Öğretmen başarıyla oluşturuldu");
      setFullName("");
      setEmail("");
      setPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğretmen oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onDismiss={() => onOpenChange(false)}>
        <SheetHeader tone="violet" title="Yeni Öğretmen" subtitle="Hesap bilgileri" />
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Öğretmen Adı</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ad Soyad"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                disabled={loading}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <button type="button" className="pn-btn pn-btn--paper" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </button>
            <button type="submit" className="pn-btn pn-btn--violet" disabled={loading}>
              {loading ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
