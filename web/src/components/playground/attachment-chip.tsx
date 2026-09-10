"use client";

import { FileAudio, FileCode2, FileSpreadsheet, FileText, FileVideo, Presentation, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatSize, type Attachment } from "@/lib/playground/attachments";

const CODE_EXTS = new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx", "py", "java", "c", "cc", "cpp", "h", "hpp", "cs", "go", "rs", "rb", "php", "swift", "kt", "kts", "scala", "dart", "lua", "pl", "r", "sql", "sh", "bash", "zsh", "bat", "ps1", "html", "htm", "css", "scss", "vue", "svelte", "json", "xml", "yaml", "yml", "toml"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** The glyph for a file: by kind first, then by what the extension says it holds. */
function KindIcon({ attachment: a }: { attachment: Attachment }) {
  const ext = extensionOf(a.name);
  const props = { className: "size-4", strokeWidth: 1.9, "aria-hidden": true } as const;
  if (a.kind === "audio") return <FileAudio {...props} />;
  if (a.kind === "video") return <FileVideo {...props} />;
  if (a.kind === "document") return <FileText {...props} />;
  if (ext === "xlsx" || ext === "csv" || ext === "tsv") return <FileSpreadsheet {...props} />;
  if (ext === "pptx") return <Presentation {...props} />;
  if (CODE_EXTS.has(ext)) return <FileCode2 {...props} />;
  return <FileText {...props} />;
}

/** "PDF", "DOCX", "MP3" — the extension in caps, or the kind when there is none. */
function tagFor(a: Attachment): string {
  const ext = extensionOf(a.name);
  if (ext) return ext.toUpperCase();
  return a.kind === "document" ? "PDF" : a.kind === "audio" ? "SES" : a.kind === "video" ? "VİDEO" : "METİN";
}

/** One tint per kind, from the panel palette — so a row of chips reads at a glance. */
const TINT: Record<Exclude<Attachment["kind"], "image">, string> = {
  document: "bg-[color:var(--pn-peach-tint)] text-[color:var(--pn-peach-ink)]",
  text: "bg-[color:var(--pn-blue-sel)] text-[color:var(--pn-blue-ink)]",
  audio: "bg-[color:var(--pn-mint-tint)] text-[color:var(--pn-mint-ink)]",
  video: "bg-[color:var(--pn-pink)] text-[color:var(--pn-pink-ink-strong)]",
};

/**
 * A non-image attachment, in the composer (removable) and in the transcript
 * (read-only). Pictures draw as thumbnails instead — a file has nothing to
 * show but its name, so the chip leads with that and says what it is
 * underneath.
 */
export function AttachmentChip({ attachment, onRemove, className }: { attachment: Attachment; onRemove?: () => void; className?: string }) {
  if (attachment.kind === "image") return null;
  const name = attachment.name || "dosya";
  return (
    <div
      title={name}
      className={cn(
        "group/chip relative flex h-14 max-w-[15rem] items-center gap-2 rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-container py-1.5 pl-1.5 pr-3",
        className,
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-[8px]", TINT[attachment.kind])}>
        <KindIcon attachment={attachment} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold leading-tight text-on-surface">{name}</span>
        <span className="mt-0.5 block font-mono text-[10px] leading-none text-on-surface-variant">
          {tagFor(attachment)} · {formatSize(attachment)}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${name} dosyasını kaldır`}
          className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-[color:var(--pn-hair-strong)] bg-surface-container text-on-surface-variant transition-colors hover:bg-[color:var(--pn-pink)] hover:text-[color:var(--pn-pink-ink-strong)]"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
