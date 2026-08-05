"use client";

import { useState } from "react";
import { Gem } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";

export function PlaygroundOreButton({ studentUserId }: { studentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  async function loadBalance() {
    const supabase = createClient();
    const { data } = await supabase
      .from("playground_credits")
      .select("balance_ore")
      .eq("user_id", studentUserId)
      .maybeSingle();
    setBalance(data?.balance_ore ?? 0);
  }

  async function handleSubmit() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("rpc_admin_grant_playground_ore", {
      p_student_id: studentUserId,
      p_amount: parsed,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Cevher eklenemedi: " + error.message);
      return;
    }
    setBalance(data);
    toast.success(`${parsed} cevher eklendi.`);
  }

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (next) loadBalance();
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Playground cevheri">
          <Gem className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-xs text-muted-foreground">
          Mevcut bakiye: <span className="font-medium text-foreground">{balance === null ? "..." : `${balance} cevher`}</span>
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8"
          />
          <Button size="sm" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Ekleniyor..." : "Ekle"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
