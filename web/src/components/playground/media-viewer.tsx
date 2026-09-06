"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/panel-ui/dialog";

/**
 * Full-screen look at one thing a student made.
 *
 * The transcript deliberately keeps media small (a 96-tall card) so a
 * conversation still reads as a conversation — but a generated picture, a clip
 * or a website is the *product*, and judging it in a thumbnail is impossible.
 * Tapping it opens it here at full size with one obvious way to save it.
 *
 * Same cut-paper shell as everything else on this route (`.pg-dialog` in
 * globals.css: white fill, navy outline, hard offset shadow), so it reads as
 * the page opening up rather than as a browser lightbox dropped on top.
 */
export type ViewerItem =
  | { kind: "image"; url: string; title: string; /** Cut-out PNG, when one exists. */ blobUrl?: string }
  | { kind: "video"; url: string; title: string }
  | { kind: "audio"; url: string; title: string }
  | { kind: "web"; html: string; title: string };

/**
 * Saves a remote file under a real name.
 *
 * A plain `<a download>` is ignored cross-origin — the browser navigates to
 * the signed storage URL instead of saving it, which on a phone means the
 * picture opens in a tab and the student has to long-press it. Fetching to a
 * blob first is what makes the name and the save stick.
 *
 * Falls back to opening the URL if the fetch is refused (no CORS header on the
 * storage response): a new tab is worse than a download but much better than a
 * button that appears to do nothing.
 */
async function saveFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    // Revoked on the next tick, not immediately: Safari cancels a download
    // whose object URL disappears in the same frame the click fires.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Extension for the saved file, from what the URL actually points at. */
function guessExtension(url: string, fallback: string): string {
  const path = url.split("?")[0];
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{2,4}$/.test(ext) ? ext : fallback;
}

export function MediaViewer({ item, onClose }: { item: ViewerItem | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!item) {
      setSaving(false);
      setCopied(false);
    }
  }, [item]);

  if (!item) return null;

  async function download() {
    if (!item) return;
    setSaving(true);
    try {
      if (item.kind === "web") {
        const blob = new Blob([item.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "site.html";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return;
      }
      // A cut-out sticker only exists as a blob in this tab and is already the
      // thing on screen, so it — not the stored original — is what saves.
      if (item.kind === "image" && item.blobUrl) {
        await saveFile(item.blobUrl, "sticker.png");
        return;
      }
      const fallback = item.kind === "image" ? "png" : item.kind === "video" ? "mp4" : "mp3";
      await saveFile(item.url, `nebula-${item.kind}.${guessExtension(item.url, fallback)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        // max-w-none because the shared DialogContent caps at sm; a picture is
        // the one thing on this route that deserves the whole viewport.
        className="pg-dialog flex max-h-[92vh] w-[min(1100px,94vw)] max-w-none flex-col gap-0 overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-center gap-2 border-b-[3px] border-outline-variant px-3 py-2">
          <DialogTitle className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-on-surface">
            {item.title}
          </DialogTitle>

          {item.kind === "web" && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(item.html);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-outline-variant px-2.5 py-1 font-mono text-micro text-on-surface-variant transition hover:border-outline hover:text-on-surface"
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              {copied ? "kopyalandı" : "kodu kopyala"}
            </button>
          )}

          <button
            type="button"
            onClick={download}
            disabled={saving}
            className="pg-btn inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-mini font-semibold disabled:opacity-60"
          >
            <Download className="size-3.5" />
            {saving ? "kaydediliyor…" : "İndir"}
          </button>

          <DialogClose asChild>
            <button
              type="button"
              aria-label="Kapat"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant text-on-surface-variant transition hover:border-outline hover:text-on-surface"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto",
            // Media sits on the sunken paper step so a white-background picture
            // still has an edge; the web preview paints its own page and gets
            // no padding at all.
            item.kind === "web" ? "bg-surface-container" : "flex items-center justify-center bg-surface-low p-3",
          )}
        >
          {item.kind === "image" ? (
            // A signed one-hour URL, or a blob: held only by this tab. next/image
            // proxies through the optimizer, which has neither the session nor the
            // blob, so it would 404 on both.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.blobUrl ?? item.url}
              alt=""
              // The checkerboard is only correct when there is transparency to
              // show — a stored original is opaque and would look damaged on it.
              className={cn("max-h-[76vh] w-auto rounded-lg object-contain", item.blobUrl && "pg-checker")}
            />
          ) : item.kind === "video" ? (
            <video src={item.url} controls autoPlay className="max-h-[76vh] w-auto rounded-lg" />
          ) : item.kind === "audio" ? (
            <audio src={item.url} controls autoPlay className="w-full max-w-lg" />
          ) : (
            <iframe
              srcDoc={item.html}
              // No allow-same-origin: model-written code must never reach the
              // session. Same rule as the inline preview it opened from.
              sandbox="allow-scripts"
              title={item.title}
              className="h-[80vh] w-full bg-white"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
