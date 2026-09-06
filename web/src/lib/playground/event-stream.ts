/**
 * Reads Server-Sent Event frames off a `fetch` response body.
 *
 * Lives on its own rather than inside the Playground component for one
 * reason: the buffering is the part that breaks, and it only breaks on input
 * a browser is unlikely to produce on demand — a frame split across two
 * network chunks, a chunk carrying three frames at once, a half-written line
 * at the end of a read. As a module it can be fed exactly those cases.
 *
 * Frames are separated by a blank line, and one frame may spread its payload
 * over several `data:` lines, so this splits on the blank line and rejoins the
 * data lines — not one event per line, which is the usual mistake.
 */
export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: Record<string, unknown> }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const frames = buffered.split("\n\n");
      // The tail is whatever came after the last blank line — possibly half a
      // frame, kept until the rest of it arrives.
      buffered = frames.pop() ?? "";
      for (const frame of frames) {
        let event = "message";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) event = line.slice(7).trim();
          else if (line.startsWith("data: ")) data += line.slice(6);
        }
        if (!data) continue;
        try {
          yield { event, data: JSON.parse(data) };
        } catch {
          // A truncated frame is not worth losing the rest of the answer over.
        }
      }
    }
  } finally {
    // Releasing the lock lets an abort tear the socket down instead of leaving
    // it pinned open by a reader nobody is draining any more.
    reader.releaseLock();
  }
}
