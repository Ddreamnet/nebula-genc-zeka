"use client";

import { useState } from "react";
import { Check, Copy, Info, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/panel-ui/sheet";
import { buildPayloadPreview, toCurl, type PayloadInput } from "@/lib/playground/payload-preview";

/**
 * `</>` — the request the next Oluştur will make, in full.
 *
 * Read-only on purpose (docs/playground-studio-plan.md §5.4): a hand-edited
 * body is an invitation to route around the server's own validation, and the
 * panel's job is to explain what the button does, not to become a second way
 * of pressing it.
 */
export function PayloadDialog({ open, onOpenChange, input }: { open: boolean; onOpenChange: (open: boolean) => void; input: PayloadInput }) {
  const [tab, setTab] = useState<"json" | "curl">("json");
  const [annotated, setAnnotated] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = buildPayloadPreview(input);
  const shown = tab === "json" ? preview.body : toCurl(preview);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" onDismiss={() => onOpenChange(false)}>
        <SheetHeader
          tone="violet"
          title="Modele ne gönderiyoruz?"
          subtitle="Gönder'e bastığında bu istek yola çıkar"
          icon={
            <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[color:var(--pn-violet)] font-mono text-[12px] font-bold text-[color:var(--pn-violet-ink-strong)]">
              &lt;/&gt;
            </span>
          }
        />

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color:var(--pn-hair)] px-4 py-2.5">
          <div className="inline-flex gap-0.5 rounded-[9px] bg-surface-low p-0.5 font-mono text-[11px] font-semibold">
            {(["json", "curl"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  "min-h-8 rounded-[7px] px-3 uppercase transition-colors",
                  tab === t ? "bg-[color:var(--pn-navy)] text-[color:var(--pn-on-navy)]" : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "json" && preview.notes.length > 0 && (
            <button type="button" onClick={() => setAnnotated((v) => !v)} aria-pressed={annotated} className="pg-chip">
              <Info className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />
              Açıklamalı
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shown);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="pn-btn pn-btn--sm pn-btn--paper"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>

        <SheetBody className="bg-surface-low">
          <p className="mb-2 font-mono text-[11px] font-semibold text-[color:var(--pn-blue-ink)]">{preview.target}</p>
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-on-surface">
            <code>{shown}</code>
          </pre>

          {tab === "json" && annotated && (
            <ul className="mt-4 flex flex-col gap-1 border-t border-[color:var(--pn-hair)] pt-3">
              {preview.notes.map((n) => (
                <li key={n.key} className="flex gap-2 text-[12px] leading-snug">
                  <code className="shrink-0 font-mono font-semibold text-[color:var(--pn-violet-ink)]">{n.key}</code>
                  <span className="text-on-surface-variant">{n.note}</span>
                </li>
              ))}
            </ul>
          )}
        </SheetBody>

        <SheetFooter className="justify-start">
          <p className="flex items-center gap-2 text-[11px] leading-snug text-on-surface-variant">
            <KeyRound className="size-3.5 shrink-0 text-[color:var(--pn-peach-ink)]" strokeWidth={1.9} aria-hidden />
            <span>
              <code className="font-mono">Authorization: Bearer ••••••</code> — anahtar sunucuda kalır, tarayıcıya hiç gelmez. Görseller de kısaltıldı.
            </span>
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
