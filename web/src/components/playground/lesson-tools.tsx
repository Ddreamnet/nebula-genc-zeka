"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ClipboardList, GraduationCap, ListOrdered, Lock, Palette, Smile } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { LESSON_EXPRESSIONS, LESSON_STYLES, buildLadder, buildStyleRun, type LessonStep } from "@/lib/playground/lesson-runs";
import { buildPrompt, cardsFor, type PromptCard, type PromptCardField } from "@/lib/playground/prompt-cards";
import type { ToolModality } from "@/lib/playground/tools";

/**
 * "Ders" — the prompt cards and the classroom runs, behind one button.
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
}) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<PromptCard | null>(null);

  const cards = cardsFor(modality, categoryId);
  const ladder = buildLadder(prompt);
  const styles = buildStyleRun(prompt);

  // Audio/video tools with neither cards nor runs would open an empty box.
  if (cards.length === 0 && !showRuns) return null;

  function close() {
    setOpen(false);
    setCard(null);
  }

  function start(label: string, steps: LessonStep[] | null) {
    if (!steps) return;
    close();
    onRun(label, steps);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCard(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Ders araçları"
          title="Ders araçları — tarif kartları ve turlar"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40",
            open
              ? "border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface"
              : "border-outline-variant text-on-surface-variant hover:border-secondary/40 hover:text-on-surface",
          )}
        >
          <GraduationCap className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        // The open card is wider than the list: a chip row like the cinematic
        // card's ten camera moves wraps to five lines at list width, which
        // turns a vocabulary into a wall.
        className={cn("pg-dialog gap-0 overflow-hidden p-0 ring-0", card ? "w-[min(580px,94vw)]" : "w-[min(460px,94vw)]")}
      >
        {card ? (
          <PromptCardForm
            card={card}
            onBack={() => setCard(null)}
            onUse={(built) => {
              onUsePrompt(built);
              close();
            }}
          />
        ) : (
          <div className="max-h-[min(72vh,600px)] overflow-y-auto p-2">
            {cards.length > 0 && (
              <>
                <SectionLabel>Tarif kartı — doldur, prompt kendi yazılsın</SectionLabel>
                {cards.map((c) => (
                  <Row key={c.id} icon={ClipboardList} title={c.name} detail={c.purpose} note={c.source} onClick={() => setCard(c)} />
                ))}
              </>
            )}

            {showRuns && (
              <>
                <SectionLabel>Tur — bir fikir, birkaç üretim, yan yana</SectionLabel>
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
        )}
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-2 pb-1 pt-2 font-mono text-micro uppercase tracking-widest text-on-surface-variant/70">{children}</h3>
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
  note,
  cost,
  balance,
  disabled,
  onClick,
}: {
  icon: typeof ClipboardList;
  title: string;
  detail: string;
  note?: string;
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
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition",
        blocked ? "cursor-not-allowed opacity-55" : "hover:bg-surface-high",
      )}
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-2",
          blocked ? "border-outline-variant text-on-surface-variant" : "border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-mini font-semibold leading-snug text-on-surface">{title}</span>
        <span className="block truncate text-micro leading-snug text-on-surface-variant">{detail}</span>
        {note && <span className="block truncate font-mono text-micro leading-snug text-on-surface-variant/60">{note}</span>}
      </span>
      {cost != null &&
        (tooExpensive ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-micro text-error">
            <Lock className="size-3" /> {cost} cevher
          </span>
        ) : (
          <span className="shrink-0 font-mono text-micro text-secondary-bright">{cost} cevher</span>
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
 *
 * Advanced groups start collapsed so the cinematic card opens on three boxes
 * instead of twenty. Everything is still one tap away; nothing is hidden from
 * the student who wants it.
 */
function PromptCardForm({
  card,
  onBack,
  onUse,
}: {
  card: PromptCard;
  onBack: () => void;
  onUse: (prompt: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const built = buildPrompt(card, values);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <div className="flex max-h-[min(76vh,640px)] flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-outline-variant px-3 py-2">
        <ClipboardList className="size-4 shrink-0 text-secondary" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-mini font-semibold text-on-surface">{card.name}</span>
          <span className="block truncate font-mono text-micro text-on-surface-variant">{card.source}</span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg px-2 py-1 font-mono text-micro text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
        >
          geri
        </button>
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
                  className="mb-1 flex w-full items-center gap-1.5 rounded-lg py-1 text-left font-mono text-micro tracking-widest text-on-surface-variant transition hover:text-on-surface"
                >
                  <ChevronDown className={cn("size-3 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                  {group.label}
                  <span className="font-sans tracking-normal opacity-60">({group.fields.length} isteğe bağlı)</span>
                </button>
              ) : (
                <h4 className="mb-1 font-mono text-micro tracking-widest text-on-surface-variant">{group.label}</h4>
              )}

              {isOpen && (
                <>
                  {group.hint && <p className="mb-2 text-micro leading-relaxed text-on-surface-variant/80">{group.hint}</p>}
                  {group.fields.map((f) => (
                    <Field key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
                  ))}
                </>
              )}
            </section>
          );
        })}
      </div>

      <footer className="shrink-0 border-t border-outline-variant p-2.5">
        <p className="pg-card pg-card--flat pg-card--sunken mb-2 max-h-28 overflow-y-auto px-2.5 py-2 text-xs leading-relaxed text-on-surface">
          {built}
        </p>
        <button
          type="button"
          onClick={() => onUse(built)}
          className="pg-btn flex w-full items-center justify-center gap-2 px-3 py-2 text-mini font-semibold"
        >
          Bu tarifi kullan <ArrowRight className="size-3.5" />
        </button>
      </footer>
    </div>
  );
}

function Field({ field, value, onChange }: { field: PromptCardField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 flex items-baseline gap-1.5 font-mono text-micro tracking-widest text-on-surface-variant">
        {field.label}
        {field.optional && <span className="font-sans tracking-normal opacity-60">isteğe bağlı</span>}
      </label>
      {field.long ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className="w-full resize-none px-2.5 py-1.5 text-mini leading-snug text-on-surface outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-2.5 py-1.5 text-mini text-on-surface outline-none"
        />
      )}
      {field.options && (
        <div className="mt-1 flex flex-wrap gap-1">
          {field.options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                // Tapping the active chip clears it — the only way back out of
                // an optional field once a chip has filled it.
                onClick={() => onChange(active ? "" : opt)}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-micro transition",
                  active
                    ? "border-[var(--pg-ink)] bg-[var(--pg-mint)] text-on-surface"
                    : "border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface",
                )}
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
