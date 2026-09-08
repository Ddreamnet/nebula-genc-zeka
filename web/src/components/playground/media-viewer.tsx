"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sheet, SheetBody, SheetContent, SheetHeader } from "@/components/panel-ui/sheet";

/**
 * Full-screen look at one thing a student made.
 *
 * The stage already shows a picture large, but "large" and "the whole screen"
 * are different questions, and a website or a clip deserves the latter.
 * Opens in the same cream card language as every dialog on the panel side.
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
export async function saveFile(url: string, filename: string) {
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
export function guessExtension(url: string, fallback: string): string {
  const path = url.split("?")[0];
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{2,4}$/.test(ext) ? ext : fallback;
}

export function MediaViewer({ item, onClose }: { item: ViewerItem | null; onClose: () => void }) {
  if (!item) return null;
  // Keyed on the thing being shown, so "saving…" and "copied" reset by
  // remount when a different output opens — no effect needed.
  return <Viewer key={item.kind === "web" ? `web:${item.title}` : item.url} item={item} onClose={onClose} />;
}

function Viewer({ item, onClose }: { item: ViewerItem; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function download() {
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
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="full" onDismiss={onClose}>
        <SheetHeader
          tone="blue"
          title={item.title}
          subtitle={item.kind === "image" ? "Görsel" : item.kind === "video" ? "Video" : item.kind === "audio" ? "Ses" : "Web sayfası"}
        >
          {item.kind === "web" && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(item.html);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="pn-btn pn-btn--sm pn-btn--paper"
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Kopyalandı" : "Kodu kopyala"}</span>
            </button>
          )}

          <button type="button" onClick={download} disabled={saving} className="pn-btn pn-btn--sm pn-btn--peach">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{saving ? "Kaydediliyor…" : "İndir"}</span>
          </button>
        </SheetHeader>

        <SheetBody
          className={cn(
            "flex flex-col p-0",
            // Media sits on the sunken step so a white-background picture
            // still has an edge; the web preview paints its own page.
            item.kind === "web" ? "bg-surface-container" : "items-center justify-center bg-surface-low p-3",
          )}
        >
          {item.kind === "image" ? (
            // A signed one-hour URL, or a blob held only by this tab. next/image
            // proxies through the optimizer, which has neither the session nor
            // the blob, so it would 404 on both.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.blobUrl ?? item.url} alt="" className={cn("max-h-full w-auto max-w-full rounded-[12px] object-contain", item.blobUrl && "pg-checker")} />
          ) : item.kind === "video" ? (
            <video src={item.url} controls autoPlay playsInline className="max-h-full w-auto max-w-full rounded-[12px]" />
          ) : item.kind === "audio" ? (
            <audio src={item.url} controls autoPlay className="w-full max-w-lg" />
          ) : (
            <iframe
              srcDoc={item.html}
              // No allow-same-origin: model-written code must never reach the
              // session. Same rule as the inline preview it opened from.
              sandbox="allow-scripts"
              title={item.title}
              className="min-h-0 w-full flex-1 bg-white"
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
