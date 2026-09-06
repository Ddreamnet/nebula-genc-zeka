"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SideDrawer } from "@/components/panel-shell/side-drawer";

interface Balance {
  total_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  regular_lessons_minutes: number;
  trial_lessons_minutes: number;
}

interface Payment {
  id: string;
  amount_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  payment_date: string;
  notes: string | null;
}

/** 412 dakika → "6 sa 52 dk". Bir öğretmen ayı dakikayla değil saatle düşünür;
 *  ham dakika yalnızca çipte (yerin en dar olduğu yerde) kalır. */
function humanMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} dk`;
  if (rest === 0) return `${hours} sa`;
  return `${hours} sa ${rest} dk`;
}

export function BalanceDrawer({ open, onClose, teacherId }: { open: boolean; onClose: () => void; teacherId: string }) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  // teacherId başına bir kez yüklenir: paneli kapatıp açmak, zaten yüklü
  // verinin üstüne bir spinner çakmaz.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || loadedFor.current === teacherId) return;
    loadedFor.current = teacherId;
    const supabase = createClient();

    (async () => {
      setLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        supabase
          .from("teacher_balance")
          .select("total_minutes, completed_regular_lessons, completed_trial_lessons, regular_lessons_minutes, trial_lessons_minutes")
          .eq("teacher_id", teacherId)
          .maybeSingle(),
        supabase
          .from("payment_history")
          .select("id, amount_minutes, completed_regular_lessons, completed_trial_lessons, payment_date, notes")
          .eq("teacher_id", teacherId)
          .order("payment_date", { ascending: false }),
      ]);

      if (balanceRes.error) toast.error("Bakiye yüklenemedi");
      setBalance(
        balanceRes.data ?? {
          total_minutes: 0,
          completed_regular_lessons: 0,
          completed_trial_lessons: 0,
          regular_lessons_minutes: 0,
          trial_lessons_minutes: 0,
        },
      );
      setPayments(historyRes.data ?? []);
      setLoading(false);
    })();
  }, [open, teacherId]);

  return (
    <SideDrawer open={open} onClose={onClose} tone="mint" title="Bakiye" subtitle="İşlenen ders süresi">
      {loading ? (
        <div className="h-24 animate-pulse rounded-[12px] bg-[color:var(--pn-mint-tint)]" />
      ) : (
        <>
          {/* Tek büyük sayı: öğretmenin bu paneli açma sebebi. Onun altındaki
              her şey o sayının nereden geldiğini açıklar. */}
          <div className="rounded-[12px] border border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint-sel)] p-4 text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pn-mint-ink)]">
              Toplam işlenen süre
            </p>
            <p className="mt-1 font-display text-[26px] font-semibold tabular-nums text-on-surface">
              {humanMinutes(balance?.total_minutes ?? 0)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Stat
              label="Normal ders"
              count={balance?.completed_regular_lessons ?? 0}
              minutes={balance?.regular_lessons_minutes ?? 0}
              tone="blue"
            />
            <Stat
              label="Deneme dersi"
              count={balance?.completed_trial_lessons ?? 0}
              minutes={balance?.trial_lessons_minutes ?? 0}
              tone="peach"
            />
          </div>

          <p className="px-1 py-1 text-[12px] leading-relaxed text-on-surface-variant">
            Her işlenen ders, süresine göre bakiyeye otomatik eklenir.
          </p>

          {payments.length > 0 && (
            <>
              <p className="pn-divider mt-2">Ödeme geçmişi</p>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-2 rounded-[12px] border border-l-[3px] border-[color:var(--pn-hair)] border-l-[color:var(--pn-mint-ink)] bg-surface-container p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold tabular-nums text-on-surface">
                      {humanMinutes(payment.amount_minutes)}
                    </p>
                    <p className="truncate text-[12px] text-on-surface-variant">
                      {payment.completed_regular_lessons} normal · {payment.completed_trial_lessons} deneme
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-on-surface-variant">
                    {format(new Date(payment.payment_date), "dd MMM yy", { locale: tr })}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </SideDrawer>
  );
}

function Stat({ label, count, minutes, tone }: { label: string; count: number; minutes: number; tone: "blue" | "peach" }) {
  return (
    <div
      className="rounded-[12px] border p-2.5"
      style={{
        background: tone === "blue" ? "var(--pn-blue-sel)" : "var(--pn-peach-sel)",
        borderColor: tone === "blue" ? "var(--pn-blue-line)" : "var(--pn-peach-line)",
      }}
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">{label}</p>
      <p className="mt-0.5 font-display text-[17px] font-semibold tabular-nums text-on-surface">{count}</p>
      <p className="font-mono text-[10px] tabular-nums text-on-surface-variant">{humanMinutes(minutes)}</p>
    </div>
  );
}
