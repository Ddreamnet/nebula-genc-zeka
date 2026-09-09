"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ClipboardList, ListOrdered, Lock, Palette, Smile } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/panel-ui/sheet";
import { useIsWide } from "@/lib/use-is-wide";
import { LESSON_EXPRESSIONS, LESSON_STYLES, buildLadder, buildStyleRun, type LessonStep } from "@/lib/playground/lesson-runs";
import { buildPrompt, cardsFor, type PromptCard, type PromptCardField } from "@/lib/playground/prompt-cards";
import type { ToolModality } from "@/lib/playground/tools";

/**
 * "Ders" — the prompt cards and the classroom runs, behind one trigger.
 *
 * Two different things share this panel because a student reaches for them in
 * the same breath: a card writes a prompt, a run takes a prompt and makes
 * several things out of it. Chaining them is the intended path — fill the
 * avatar card, then ladder what it wrote and watch which field did what.
 *
 * Cards exist for every modality (see `prompt-cards.ts`); the runs are image
 * only, because all three come from image tasks in the decks and because text
 * tools carry a conversation a batch of independent turns would corrupt. The
 * runs section is absent rather than disabled when it doesn't apply.
 *
 * Nothing here touches the network: it produces a string or a list of steps
 * and hands it up to the Playground.
 */
export function LessonTools({
  prompt,
  modality,
  categoryId,
  oreCost,
  balance,
  disabled,
  showRuns,
  hasImageInThread,
  onUsePrompt,
  onRun,
  onRunExpressions,
  trigger,
}: {
  /** What's in the composer right now — the ladder and style run take it apart. */
  prompt: string;
  modality: ToolModality;
  categoryId?: string;
  /** Ore for ONE generation with the selected model, for the "N × cost" line. */
  oreCost: number;
  balance: number;
  disabled: boolean;
  /** Runs only make sense for image tools. */
  showRuns: boolean;
  /** Whether this thread has produced a picture the sticker run can build on. */
  hasImageInThread: boolean;
  /** Writes a built prompt into the composer without sending it. */
  onUsePrompt: (prompt: string) => void;
  onRun: (label: string, steps: LessonStep[]) => void;
  onRunExpressions: () => void;
  /** The element that opens the panel. Rendered with `asChild`. */
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wide = useIsWide();
  const [card, setCard] = useState<PromptCard | null>(null);

  const cards = cardsFor(modality, categoryId);
  const ladder = buildLadder(prompt);
  const styles = buildStyleRun(prompt);
  const empty = cards.length === 0 && !showRuns;

  function close() {
    setOpen(false);
    setCard(null);
  }

  function start(label: string, steps: LessonStep[] | null) {
    if (!steps) return;
    close();
    onRun(label, steps);
  }

  // One body, two surfaces: a popover pinned above the trigger on a wide
  // screen, a bottom sheet on a phone. The list is exactly the same node.
  const body = card ? (
    <PromptCardForm
      card={card}
      wide={wide}
      onBack={() => setCard(null)}
      onUse={(built) => {
        onUsePrompt(built);
        close();
      }}
    />
  ) : (
    <div className={cn("overflow-y-auto p-2", wide ? "max-h-[min(72vh,600px)]" : "pn-scroll min-h-0 flex-1")}>
      {empty && (
        <p className="px-3 py-6 text-center text-[13px] text-on-surface-variant">Bu model için hazır bir şablon yok.</p>
      )}
      {cards.length > 0 && (
        <>
          <SectionLabel>Tarif kartları</SectionLabel>
          {cards.map((c) => (
            <Row key={c.id} icon={ClipboardList} title={c.name} detail={c.purpose} onClick={() => setCard(c)} />
          ))}
        </>
      )}

      {showRuns && (
        <>
          <SectionLabel>Sınıf turları</SectionLabel>
          <Row
            icon={ListOrdered}
            title="Merdiven"
            detail={
              ladder
                ? `${ladder.length} tur — tarifin kelime kelime nasıl büyüdüğünü gösterir`
                : "Önce virgüllü, detaylı bir tarif yaz — merdiven onu kademelere böler"
            }
            cost={ladder ? ladder.length * oreCost : null}
            balance={balance}
            disabled={!ladder}
            onClick={() => start("Merdiven", ladder)}
          />
          <Row
            icon={Palette}
            title="Stil turu"
            detail={styles ? LESSON_STYLES.join(" · ") : "Önce bir tarif yaz"}
            cost={styles ? styles.length * oreCost : null}
            balance={balance}
            disabled={!styles}
            onClick={() => start("Stil turu", styles)}
          />
          <Row
            icon={Smile}
            title="İfade turu"
            detail={
              hasImageInThread
                ? LESSON_EXPRESSIONS.map((e) => e.label).join(" · ")
                : "Önce bir avatar üret — ifade turu onu referans alır"
            }
            cost={hasImageInThread ? LESSON_EXPRESSIONS.length * oreCost : null}
            balance={balance}
            disabled={!hasImageInThread}
            onClick={() => {
              close();
              onRunExpressions();
            }}
          />
        </>
      )}
    </div>
  );

  const onOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (!next) setCard(null);
  };

  if (!wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        {/* Content height, not 92dvh: the list is four or five rows, and a
            card that tall for it read as a page. The form is taller; the
            sheet grows into it instead of jumping (animateHeight). */}
        <SheetContent size="md" animateHeight onDismiss={() => onOpenChange(false)}>
          <SheetTitle className="sr-only">Prompt şablonları ve sınıf turları</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        // The open card is wider than the list: a chip row like the cinematic
        // card's ten camera moves wraps to five lines at list width.
        className={cn("gap-0 overflow-hidden p-0", card ? "w-[min(580px,94vw)]" : "w-[min(460px,94vw)]")}
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="pn-divider mt-1" style={{ ["--pn-divider-ink" as string]: "var(--pn-blue-ink)" }}>
      {children}
    </p>
  );
}

/**
 * One entry. The ore line is the whole reason a run is a deliberate choice
 * rather than a button you press twice: six stickers is six generations, and
 * that has to be readable before the press, not after.
 */
function Row({
  icon: Icon,
  title,
  detail,
  cost,
  balance,
  disabled,
  onClick,
}: {
  icon: typeof ClipboardList;
  title: string;
  detail: string;
  cost?: number | null;
  balance?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const tooExpensive = cost != null && balance != null && cost > balance;
  const blocked = disabled || tooExpensive;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={blocked}
      className={cn("pn-row gap-2.5 p-2", blocked && "cursor-not-allowed opacity-55")}
      style={{ ["--pn-row-hover" as string]: "var(--pn-blue-tint)" }}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[9px] border",
          blocked
            ? "border-[color:var(--pn-hair)] text-on-surface-variant"
            : "border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint)] text-[color:var(--pn-mint-ink-strong)]",
        )}
      >
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-snug text-on-surface">{title}</span>
        <span className="block truncate text-[12px] leading-snug text-on-surface-variant">{detail}</span>
      </span>
      {cost != null &&
        (tooExpensive ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] font-semibold text-[color:var(--pn-pink-ink)]">
            <Lock className="size-3" /> {cost} cevher
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[10px] font-semibold text-[color:var(--pn-peach-ink)]">{cost} cevher</span>
        ))}
    </button>
  );
}

/**
 * The fill-in-the-blank card, with the built prompt written out live
 * underneath.
 *
 * The live line is the teaching part, not a preview: the whole idea is that a
 * prompt is made of pieces, and watching the sentence grow as you tap a chip is
 * what makes that land. It writes into the composer rather than sending — the
 * student still presses gönder, and can still change a word first.
 */
function PromptCardForm({ card, wide, onBack, onUse }: { card: PromptCard; wide: boolean; onBack: () => void; onUse: (prompt: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const built = buildPrompt(card, values);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <div className={cn("flex flex-col", wide ? "max-h-[min(76vh,640px)]" : "min-h-0 flex-1")}>
      {/* Back is an arrow at the left, where a back control lives everywhere
          else on a phone; the card's title follows it. No curriculum line
          ("Hafta 2 · …") — it is the deck's bookkeeping, not the student's. */}
      <header className="pn-band pn-band--blue shrink-0 !gap-2 !py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="grid size-9 shrink-0 place-items-center rounded-[10px] text-on-surface-variant transition-colors duration-[.18s] hover:bg-[color:var(--pn-blue)] hover:text-on-surface"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2} aria-hidden />
        </button>
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-on-surface">{card.name}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {card.groups.map((group) => {
          const isOpen = openGroups[group.label] ?? !group.advanced;
          return (
            <section key={group.label} className="mb-3">
              {group.advanced ? (
                <button
                  type="button"
                  onClick={() => setOpenGroups((g) => ({ ...g, [group.label]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="mb-1 flex w-full items-center gap-1.5 rounded-[8px] py-1 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <ChevronDown className={cn("size-3 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                  {group.label}
                </button>
              ) : (
                <h4 className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{group.label}</h4>
              )}

              {isOpen && (
                <>
                  {group.hint && <p className="mb-2 text-[12px] leading-relaxed text-on-surface-variant">{group.hint}</p>}
                  {group.fields.map((f) => (
                    <Field key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
                  ))}
                </>
              )}
            </section>
          );
        })}
      </div>

      <footer className="shrink-0 border-t border-[color:var(--pn-hair)] bg-surface-low p-2.5">
        <p className="mb-2 max-h-28 overflow-y-auto rounded-[10px] border border-[color:var(--pn-hair)] bg-surface-container px-2.5 py-2 text-[12px] leading-relaxed text-on-surface">
          {built}
        </p>
        <button type="button" onClick={() => onUse(built)} className="pn-btn pn-btn--peach w-full">
          Bu tarifi kullan <ArrowRight className="size-4" />
        </button>
      </footer>
    </div>
  );
}

function Field({ field, value, onChange }: { field: PromptCardField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 flex items-baseline gap-1.5 text-[12px] font-semibold text-on-surface">
        {field.label}
        {field.optional && <span className="font-normal text-on-surface-variant">isteğe bağlı</span>}
      </label>
      {field.long ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={2} className="w-full resize-none px-2.5 py-1.5 leading-snug outline-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="w-full px-2.5 py-1.5 outline-none" />
      )}
      {field.options && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {field.options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                // Tapping the active chip clears it — the only way back out of
                // an optional field once a chip has filled it.
                onClick={() => onChange(active ? "" : opt)}
                aria-pressed={active}
                className="pg-chip pg-chip--tag"
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
