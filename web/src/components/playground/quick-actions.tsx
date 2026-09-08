"use client";

import { ClipboardList, ListOrdered, Scale } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PlaygroundTool, ToolModality } from "@/lib/playground/tools";
import type { LessonStep } from "@/lib/playground/lesson-runs";
import { LessonTools } from "./lesson-tools";
import { ComparePicker } from "./model-picker";
import { ToolAvatar } from "./transcript";

/**
 * The shortcut row, directly above the composer.
 *
 * Three doors to things that already exist elsewhere in the Playground — the
 * prompt cards, the classroom runs, the comparison mode. They used to be
 * three 64px cream cards and took more vertical space than they earned; a
 * shortcut is a button, not a card. Everything is still one click away and
 * the stage got the height back.
 */
export function QuickActions({
  tool,
  categoryId,
  prompt,
  ladder,
  oreCost,
  balance,
  disabled,
  hasImageInThread,
  onUsePrompt,
  onRun,
  onRunExpressions,
  compare,
}: {
  tool: PlaygroundTool;
  categoryId?: string;
  prompt: string;
  /** The ladder the current prompt would produce, or null if it can't be split. */
  ladder: LessonStep[] | null;
  oreCost: number;
  balance: number;
  disabled: boolean;
  hasImageInThread: boolean;
  onUsePrompt: (prompt: string) => void;
  onRun: (label: string, steps: LessonStep[]) => void;
  onRunExpressions: () => void;
  compare: {
    tool: PlaygroundTool | null;
    available: boolean;
    options: PlaygroundTool[];
    onToggle: () => void;
    onPick: (tool: PlaygroundTool) => void;
  };
}) {
  const modality: ToolModality = tool.modality;
  const ladderCost = ladder ? ladder.length * oreCost : 0;
  const ladderTooExpensive = ladder !== null && ladderCost > balance;
  const canLadder = modality === "image" && ladder !== null && !ladderTooExpensive && !disabled;

  const ladderTitle =
    modality !== "image"
      ? "Merdiven görsel modellerde açık"
      : !ladder
        ? "Önce virgüllü, detaylı bir tarif yaz — merdiven onu kademelere böler"
        : ladderTooExpensive
          ? `${ladder.length} tur · ${ladderCost} cevher — bakiye yetmiyor`
          : `${ladder.length} tur · ${ladderCost} cevher — tarifin kelime kelime nasıl büyüdüğünü gösterir`;

  return (
    <div className="pg-center flex items-center gap-2 overflow-x-auto px-0.5 [scrollbar-width:none]">
      {/* Card 1 is the LessonTools popover's own trigger, so the cards and the
          runs open right above it. */}
      <LessonTools
        prompt={prompt}
        modality={modality}
        categoryId={categoryId}
        oreCost={oreCost}
        balance={balance}
        disabled={disabled}
        showRuns={modality === "image"}
        hasImageInThread={hasImageInThread}
        onUsePrompt={onUsePrompt}
        onRun={onRun}
        onRunExpressions={onRunExpressions}
        trigger={
          <button type="button" className="pg-quick shrink-0" disabled={disabled} title="Hazır tarif kartları ve sınıf turları">
            <ClipboardList className="size-4 shrink-0 text-[color:var(--pn-blue-ink)]" strokeWidth={1.9} aria-hidden />
            Prompt şablonu
          </button>
        }
      />

      <button
        type="button"
        className="pg-quick shrink-0"
        disabled={!canLadder}
        onClick={() => ladder && onRun("Merdiven", ladder)}
        title={ladderTitle}
      >
        <ListOrdered className="size-4 shrink-0 text-[color:var(--pn-violet-ink)]" strokeWidth={1.9} aria-hidden />
        Merdiven
        {ladder && modality === "image" && (
          <span className={cn("font-mono text-[10px] font-semibold", ladderTooExpensive ? "text-[color:var(--pn-pink-ink)]" : "text-[color:var(--pn-peach-ink)]")}>
            {ladderCost}
          </span>
        )}
      </button>

      <button
        type="button"
        className={cn("pg-quick shrink-0", compare.tool && "!border-[color:var(--pn-peach-line)] !bg-[color:var(--pn-peach-tint)]")}
        onClick={compare.onToggle}
        disabled={disabled || !compare.available}
        aria-pressed={!!compare.tool}
        title={
          !compare.available
            ? "Karşılaştırma videoda kapalı — iki video hem çok cevher harcar hem de dakikalarca sürer."
            : compare.tool
              ? "Karşılaştırma açık — aynı istek iki modele birden gidiyor. Kapatmak için dokun."
              : "Aynı isteği iki farklı modele gönder, cevaplarını yan yana gör. İki üretim, iki katı cevher."
        }
      >
        <Scale className="size-4 shrink-0 text-[color:var(--pn-peach-ink)]" strokeWidth={1.9} aria-hidden />
        Karşılaştır
      </button>

      {/* Once comparison is on, the second model is a control of its own —
          otherwise "compare with what?" has no answer on this row. */}
      {compare.tool && (
        <ComparePicker tool={compare.tool} options={compare.options} disabled={disabled} onPick={compare.onPick}>
          <button type="button" className="pg-quick shrink-0" disabled={disabled} title={`Sağdaki model: ${compare.tool.name}`}>
            <span className="font-mono text-[10px] font-semibold text-on-surface-variant">VS</span>
            <ToolAvatar tool={compare.tool} className="size-5" iconClassName="size-2.5" />
            <span className="max-w-[8rem] truncate">{compare.tool.name}</span>
          </button>
        </ComparePicker>
      )}
    </div>
  );
}
