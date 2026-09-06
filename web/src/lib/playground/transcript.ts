/**
 * Folding the Playground transcript into rows.
 *
 * Lives outside the Playground component for one reason: it is the only part
 * of the comparison feature that is pure logic with real edge cases — an
 * unpaired half, a model switch marker landing between two turns, the same
 * question asked twice of one model — and in the component it could only ever
 * be checked by looking at the screen. Here it can be run against those cases
 * directly.
 *
 * Structurally typed rather than importing the component's `Msg`: everything
 * this needs is four fields, and the component owning the richer type is the
 * right way round.
 */
export interface TranscriptMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  kind?: string;
  toolId?: string;
  compare?: "a" | "b";
}

/** One thing the transcript draws: a lone bubble, or a comparison's two. */
export type Row<M extends TranscriptMsg = TranscriptMsg> =
  | { kind: "one"; key: string; msg: M }
  | { kind: "pair"; key: string; left: M; right: M };

/**
 * Folds the flat message list into what the transcript actually draws.
 *
 * Two shapes turn into a pair, and they are different because a comparison
 * looks different live than it does after a reload:
 *
 *  - Live, the two replies were pushed together and carry `compare` markers,
 *    so they are simply adjacent.
 *  - Reloaded, they are not marked at all. The transcript tables store one
 *    assistant row per user row, so a comparison is written as two ordinary
 *    turns — the same prompt twice, answered by two different models. Rather
 *    than migrate a schema for a flag, that exact signature is what is matched
 *    here: same user text, two different tools, nothing in between. Two
 *    genuinely separate sends of one prompt to two models look identical to a
 *    comparison, and drawing them side by side is the right thing for those
 *    too. The same prompt twice to the SAME model is not folded, because the
 *    tool ids match — which is also what keeps an ordinary repeated question
 *    out of this.
 */
export function buildRows<M extends TranscriptMsg>(messages: M[]): Row<M>[] {
  const rows: Row<M>[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const next = messages[i + 1];

    if (m.compare === "a" && next?.compare === "b") {
      rows.push({ kind: "pair", key: `p${i}`, left: m, right: next });
      i += 1;
      continue;
    }

    const [a, b, c] = [messages[i + 1], messages[i + 2], messages[i + 3]];
    if (
      m.role === "user" &&
      a?.role === "assistant" && a.kind !== "switch" &&
      b?.role === "user" && b.content === m.content &&
      c?.role === "assistant" && c.kind !== "switch" &&
      a.toolId && c.toolId && a.toolId !== c.toolId
    ) {
      rows.push({ kind: "one", key: `u${i}`, msg: m });
      rows.push({ kind: "pair", key: `p${i}`, left: a, right: c });
      i += 3;
      continue;
    }

    rows.push({ kind: "one", key: `r${i}`, msg: m });
  }
  return rows;
}
