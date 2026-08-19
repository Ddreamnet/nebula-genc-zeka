"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Card, CardContent } from "@/components/panel-ui/card";
import { Clock, CheckCircle2, Calendar, Receipt } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

interface TeacherBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

interface BalanceData {
  total_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  regular_lessons_minutes: number;
  trial_lessons_minutes: number;
}

interface PaymentHistory {
  id: string;
  amount_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  payment_date: string;
  notes: string | null;
}

function formatMinutes(minutes: number) {
  return `${minutes} dakika`;
}

export function TeacherBalanceDialog({ open, onOpenChange, teacherId }: TeacherBalanceDialogProps) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  // Fetched once per teacherId, not on every open — reopening for the same
  // teacher shouldn't refetch/flash a spinner over data already loaded.
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || loadedForRef.current === teacherId) return;
    loadedForRef.current = teacherId;
    const supabase = createClient();

    async function fetchBalance() {
      setLoading(true);
      const { data, error } = await supabase.from("teacher_balance").select("*").eq("teacher_id", teacherId).maybeSingle();
      if (error) {
        toast.error("Bakiye bilgisi yüklenirken hata oluştu");
      }
      setBalance(
        data ?? {
          total_minutes: 0,
          completed_regular_lessons: 0,
          completed_trial_lessons: 0,
          regular_lessons_minutes: 0,
          trial_lessons_minutes: 0,
        },
      );
      setLoading(false);
    }

    async function fetchPaymentHistory() {
      const { data, error } = await supabase.from("payment_history").select("*").eq("teacher_id", teacherId).order("payment_date", { ascending: false });
      if (error) {
        toast.error("Ödeme geçmişi yüklenirken hata oluştu");
        return;
      }
      setPaymentHistory(data ?? []);
    }

    fetchBalance();
    fetchPaymentHistory();
  }, [open, teacherId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Bakiye Durumu
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface-dim rounded-xl p-6 border-[2.5px] border-primary">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Toplam İşlenen Süre</p>
                <p className="text-3xl font-bold text-primary">{formatMinutes(balance?.total_minutes ?? 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-card border rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">Normal Dersler</p>
                </div>
                <p className="text-lg sm:text-2xl font-semibold break-words">
                  {balance?.completed_regular_lessons ?? 0} ders ({formatMinutes(balance?.regular_lessons_minutes ?? 0)})
                </p>
              </div>

              <div className="bg-card border rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">Deneme Dersleri</p>
                </div>
                <p className="text-lg sm:text-2xl font-semibold break-words">
                  {balance?.completed_trial_lessons ?? 0} ders ({formatMinutes(balance?.trial_lessons_minutes ?? 0)})
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">Her işlenen ders, ders süresine göre bakiyenize otomatik eklenir</div>

            {paymentHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <h3 className="font-semibold text-sm">Ödeme Geçmişi</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {paymentHistory.map((payment) => (
                    <Card key={payment.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-primary" />
                              <p className="font-semibold text-sm">{formatMinutes(payment.amount_minutes)}</p>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                                {payment.completed_regular_lessons} ders
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-purple-500" />
                                {payment.completed_trial_lessons} ders
                              </span>
                            </div>
                          </div>
                          <p className="text-xs font-medium">{format(new Date(payment.payment_date), "dd MMM yyyy", { locale: tr })}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
