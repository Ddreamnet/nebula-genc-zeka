/**
 * Shapes shared by the Playground's pieces (stage, transcript, composer,
 * history). They used to live inside playground.tsx; splitting that file
 * into one component per region is what moved them here.
 */
import type { StudioParams } from "@/lib/playground/params";

export type Msg = {
  /**
   * Stable client-side handle for this message.
   *
   * Everything used to be patched by position — "the last assistant turn" —
   * which only works while exactly one generation is ever in flight. A
   * comparison runs two at once, and whichever finishes first would otherwise
   * write its answer into the other one's bubble. Ids are assigned when the
   * placeholder is pushed and never reused; messages restored from a stored
   * transcript have none, because nothing is ever written into them.
   */
  id?: string;
  role: "user" | "assistant";
  content: string;
  /** Images the student attached to their own message, as data URLs. */
  attachments?: string[];
  imageUrl?: string;
  videoUrl?: string;
  videoPending?: boolean;
  audioUrl?: string;
  /**
   * "switch" is not a message at all — it's the marker dropped into the
   * transcript when the student changes model mid-conversation, so the thread
   * shows where the handover happened instead of silently continuing under a
   * different brand. Carries no content and is never sent to any model.
   */
  kind?: "text" | "code" | "switch";
  /**
   * The model's own thinking, streamed on a separate channel by the models
   * flagged `reasoning` in the catalog. Session-only: the transcript tables
   * store the answer, not the reasoning, so reopening a chat shows the reply
   * without it. That is deliberate — the thinking is a live teaching aid, not
   * a record, and storing it would mean touching the chat history schema.
   */
  reasoning?: string;
  /**
   * Which tool produced this turn. Needed because the conversation now
   * survives model changes: rendering every bubble with the *current* model's
   * avatar would retroactively re-attribute old answers to whichever model
   * happens to be selected now.
   */
  toolId?: string;
  /**
   * Which half of a comparison this reply is. Absent on an ordinary turn.
   *
   * The two halves are always pushed together and adjacent, so the transcript
   * renders a pair by looking at one message and its neighbour rather than
   * carrying a group id around.
   */
  compare?: "a" | "b";
  /**
   * The studio dials this reply was made with — only the ones moved off their
   * default, which is also exactly what `ai_generations.params` stores.
   *
   * Set when the generation is fired, and read back from the database when a
   * chat is reopened, so a student can look at a picture they made last week
   * and see that it was 2K with the seed locked. The stage turns it into a
   * chip that loads those settings back into the studio.
   */
  params?: StudioParams;
};

export type GateReason = "insufficient_balance" | "login_required" | null;

/** A lesson run in flight — which task, and how far through it we are. */
export type RunState = { label: string; done: number; total: number; step: string };

/**
 * One turn as the stage draws it: the prompt, and the reply (or the two
 * replies of a comparison) it produced. Built from the flat message list by
 * `buildStageItems`.
 */
export interface StageItem {
  key: string;
  prompt: Msg;
  replies: Msg[];
}

/**
 * Folds the transcript into stage items — one per user message, carrying
 * every assistant message up to the next user message. Switch markers are
 * skipped: the stage shows outputs, and a handover is not one.
 */
export function buildStageItems(messages: Msg[]): StageItem[] {
  const items: StageItem[] = [];
  let current: StageItem | null = null;
  messages.forEach((m, i) => {
    if (m.kind === "switch") return;
    if (m.role === "user") {
      current = { key: m.id ?? `s${i}`, prompt: m, replies: [] };
      items.push(current);
    } else if (current) {
      current.replies.push(m);
    }
  });
  return items.filter((it) => it.replies.length > 0);
}
