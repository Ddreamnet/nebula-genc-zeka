/**
 * Attachments: what a student can hand a model besides words.
 *
 * Until 10 Sep 2026 the only attachable thing was a picture. This module is
 * the one description of everything else — PDFs, text and Office files,
 * sound and video — shared by the composer that accepts them, the route that
 * checks them and the pricing that bills them. Nothing here touches the
 * network or a secret, so it is safe in the client bundle.
 *
 * Five kinds, and how each one reaches a model (all verified against
 * OpenRouter's multimodal docs, 10 Sep 2026 — see `request.ts` for the wire
 * shapes):
 *  - image     → `image_url` content part (unchanged).
 *  - document  → a PDF as a `file` content part. Models that read PDFs
 *                natively (Claude, GPT-5, Gemini, Grok, Mistral) get the file
 *                itself; for the rest OpenRouter's free `cloudflare-ai` parser
 *                turns it into text first, so a PDF works on EVERY text model.
 *  - text      → never a part at all: the file's text is pasted into the
 *                prompt inside a <dosya> block. Works on every model, which is
 *                why it is also the route for Word, Excel and PowerPoint —
 *                those are unpacked to text in the browser (see
 *                `office-text.ts`) rather than sent as binaries.
 *  - audio     → `input_audio` part, base64 only. Gemini 2.5 Flash is the one
 *                live text model that lists audio input.
 *  - video     → `video_url` part with a data URL. Gemini, Kimi K3, MiniMax
 *                M3 and Gemma 4 list video input.
 *
 * Eligibility per kind comes from the model's `inputModalities` in the
 * generated catalog, the same source the image rule already used.
 */

export type AttachmentKind = "image" | "document" | "text" | "audio" | "video";

export interface Attachment {
  kind: AttachmentKind;
  /** File name as picked, trimmed; "" for a pasted or re-encoded picture. */
  name: string;
  /**
   * What the model is told the payload is. For binary kinds this is the MIME
   * in the data URL; for `text` it is always "text/plain", whatever the file
   * started life as.
   */
  mime: string;
  /** A data URL for image/document/audio/video; the extracted text itself for `text`. */
  data: string;
  /**
   * Bytes of the payload — the decoded data URL, or the character count for
   * `text`. The composer's chip shows it; the price scales on it. The server
   * recomputes it from `data` rather than trusting the client's figure.
   */
  size: number;
}

/**
 * How much one attachment may weigh, per kind. Images are downscaled to
 * ~1024px in the browser before upload, so 5 MB only trips on a crafted
 * payload; the others are real user-facing ceilings and the composer says so.
 */
export const ATTACHMENT_LIMITS: Record<AttachmentKind, number> = {
  image: 5 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  /** Characters of extracted text. ~50k tokens — a 40-page essay. */
  text: 200 * 1024,
  audio: 10 * 1024 * 1024,
  video: 20 * 1024 * 1024,
};

/**
 * How many attachments a text model takes on one message, whatever the mix.
 * The same 3 the image rule used: enough for "compare these", small enough
 * that a kid cannot quietly run up a sixteen-file bill.
 */
export const TEXT_ATTACHMENT_SLOTS = 3;

/** Turkish, lower-case: fits "Bu model ses dosyası okuyamıyor" and "görsel, PDF, metin…". */
export const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "görsel",
  document: "PDF",
  text: "metin",
  audio: "ses",
  video: "video",
};

export const KIND_ORDER: readonly AttachmentKind[] = ["image", "document", "text", "audio", "video"];

/* ------------------------------------------------------------------ */
/* Formats                                                             */
/* ------------------------------------------------------------------ */

/** What the browser actually emits for a picture — always re-encoded to JPEG, but the server accepts all three. */
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "heic", "heif"]);

/** OpenRouter's audio format names, keyed by the MIME types browsers report for them. */
const AUDIO_FORMAT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/vnd.wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/x-aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
};
const AUDIO_FORMAT_BY_EXT: Record<string, string> = { mp3: "mp3", wav: "wav", m4a: "m4a", aac: "aac", ogg: "ogg", oga: "ogg", flac: "flac", aiff: "aiff", aif: "aiff" };
/** The one MIME we put in the data URL per format, so the server has a short whitelist. */
const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aiff: "audio/aiff",
};

/**
 * Video MIMEs as OpenRouter (and Gemini behind it) name them. Note `video/mov`
 * rather than the browser's `video/quicktime`: that is the name in both the
 * OpenRouter docs and Gemini's own supported list, so a .mov is relabelled.
 */
const VIDEO_MIME_BY_MIME: Record<string, string> = {
  "video/mp4": "video/mp4",
  "video/mpeg": "video/mpeg",
  "video/quicktime": "video/mov",
  "video/mov": "video/mov",
  "video/webm": "video/webm",
};
const VIDEO_MIME_BY_EXT: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mpeg: "video/mpeg", mpg: "video/mpeg", mov: "video/mov", webm: "video/webm" };
const VIDEO_MIMES = new Set(Object.values(VIDEO_MIME_BY_MIME));

/** Office files that are unpacked to text in the browser. */
export type OfficeKind = "docx" | "xlsx" | "pptx";
const OFFICE_BY_EXT: Record<string, OfficeKind> = { docx: "docx", xlsx: "xlsx", pptx: "pptx" };

/**
 * Plain-text extensions, by family. Windows reports an empty MIME for most
 * of these, so the extension is the only signal there.
 */
const TEXT_EXTS = new Set([
  // prose & data
  "txt", "md", "markdown", "csv", "tsv", "json", "jsonl", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf", "log", "srt", "vtt", "tex", "bib",
  // web
  "html", "htm", "css", "scss", "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "svelte",
  // code
  "py", "java", "c", "cc", "cpp", "h", "hpp", "cs", "go", "rs", "rb", "php", "swift", "kt", "kts", "scala", "dart", "lua", "pl", "r", "m", "sql", "sh", "bash", "zsh", "bat", "ps1",
]);
const TEXT_MIMES = new Set(["application/json", "application/xml", "application/x-yaml", "application/yaml", "application/javascript", "application/x-javascript", "application/typescript", "application/sql", "application/x-sh", "application/ld+json"]);

export interface FileClass {
  kind: AttachmentKind;
  /** The MIME the attachment will carry (canonical, not what the browser said). */
  mime: string;
  /** Set when the file is an Office document that has to be unpacked first. */
  office?: OfficeKind;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * What kind of attachment a picked file would become, or null when it is
 * nothing we take. Decided from the browser's MIME first and the extension
 * second — the extension matters because Windows hands over "" for .md, .ts,
 * .m4a and most code files, and "application/octet-stream" for others.
 */
export function classifyFile(name: string, type: string): FileClass | null {
  const ext = extensionOf(name);
  const mime = (type || "").toLowerCase().split(";")[0].trim();

  if (mime.startsWith("image/") || (!mime && IMAGE_EXTS.has(ext))) return { kind: "image", mime: mime || `image/${ext}` };
  if (mime === "application/pdf" || ext === "pdf") return { kind: "document", mime: "application/pdf" };
  if (OFFICE_BY_EXT[ext]) return { kind: "text", mime: "text/plain", office: OFFICE_BY_EXT[ext] };

  const audioFormat = AUDIO_FORMAT_BY_MIME[mime] ?? AUDIO_FORMAT_BY_EXT[ext];
  if (audioFormat) return { kind: "audio", mime: AUDIO_MIME_BY_FORMAT[audioFormat] };

  const videoMime = VIDEO_MIME_BY_MIME[mime] ?? VIDEO_MIME_BY_EXT[ext];
  if (videoMime) return { kind: "video", mime: videoMime };

  if (mime.startsWith("text/") || TEXT_MIMES.has(mime) || TEXT_EXTS.has(ext)) return { kind: "text", mime: "text/plain" };
  return null;
}

/** OpenRouter's `format` for an audio attachment's MIME ("mp3", "wav", …). */
export function audioFormat(mime: string): string | null {
  return AUDIO_FORMAT_BY_MIME[mime] ?? null;
}

/**
 * The `accept` attribute for the file picker, from the kinds a model takes.
 * Extensions and MIMEs both: MIMEs so a phone offers its camera roll for
 * "image/*", extensions so a desktop picker lists .md and .m4a files whose
 * MIME the OS does not know.
 */
export function acceptFor(kinds: readonly AttachmentKind[]): string {
  const parts: string[] = [];
  if (kinds.includes("image")) parts.push("image/*");
  if (kinds.includes("document")) parts.push(".pdf", "application/pdf");
  if (kinds.includes("text")) {
    parts.push("text/*", ...Object.keys(OFFICE_BY_EXT).map((e) => `.${e}`), ...[...TEXT_EXTS].map((e) => `.${e}`));
  }
  if (kinds.includes("audio")) parts.push(...Object.values(AUDIO_MIME_BY_FORMAT), ...Object.keys(AUDIO_FORMAT_BY_EXT).map((e) => `.${e}`));
  if (kinds.includes("video")) parts.push(...VIDEO_MIMES, ...Object.keys(VIDEO_MIME_BY_EXT).map((e) => `.${e}`));
  return parts.join(",");
}

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

/**
 * Which kinds a tool takes, from its modality and the catalog's input
 * modalities. Kept free of the catalog itself so it can be unit-tested; the
 * wiring that reads `capsFor(tool)` lives in `params.ts`.
 *
 * Text tools: images if the catalog lists them (the image rule the product
 * shipped with), documents and text always (a PDF is parsed to text for any
 * model that cannot read one, and text is just prompt), sound and video only
 * where listed. Image and video tools take pictures only — their attachments
 * are references and frames, not context.
 */
export function kindsFor(modality: "text" | "image" | "video" | "audio", maxImageInputs: number | undefined, inputModalities: readonly string[]): AttachmentKind[] {
  if (modality === "text") {
    const kinds: AttachmentKind[] = [];
    if (inputModalities.includes("image")) kinds.push("image");
    kinds.push("document", "text");
    if (inputModalities.includes("audio")) kinds.push("audio");
    if (inputModalities.includes("video")) kinds.push("video");
    return kinds;
  }
  return (maxImageInputs ?? 0) > 0 ? ["image"] : [];
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** What pricing needs to know about one input — its kind and its weight, never its bytes. */
export interface InputRef {
  kind: AttachmentKind;
  /** Bytes for binary kinds, characters for text; 0 when unknown (a stored reference). */
  weight: number;
}

export function inputRef(a: Pick<Attachment, "kind" | "size">): InputRef {
  return { kind: a.kind, weight: a.size };
}

/** A picture the server re-reads from storage — its size is not known client-side and does not matter. */
export const IMAGE_REF: InputRef = { kind: "image", weight: 0 };

/**
 * The cevher surcharge for one input, on top of the tool's own price.
 *
 * Image figures are the ones the product shipped with (see the note in
 * tools.ts on how they were measured). The rest are product prices, set
 * from what the token bill actually comes to and rounded to something a
 * student can predict:
 *  - a PDF scales with size — 0.5 per started MB. A text PDF at 1 MB is
 *    ~30 pages, ~45k tokens; on Sonnet 5 ($3/M) that is ~3 cevher of real
 *    cost, on Haiku ~1. Product price sits under real cost on the priciest
 *    model on purpose, exactly as the flat per-message text price does.
 *  - text scales the same way at 0.1 per started 50 KB (~12k tokens).
 *  - sound is flat: Gemini bills ~32 tokens a second, so ten minutes is under
 *    $0.01. Video is flat too at ~300 tokens a second, and 20 MB of phone
 *    footage is well under a minute.
 * Video tools pay nothing for a frame image: providers fold it into the
 * clip's own rate.
 */
export function inputOre(ref: InputRef, modality: "text" | "image" | "video" | "audio"): number {
  switch (ref.kind) {
    case "image":
      return modality === "image" ? 0.25 : modality === "video" ? 0 : 0.1;
    case "document":
      return cents(0.5 * Math.max(1, Math.ceil(ref.weight / (1024 * 1024))));
    case "text":
      return cents(0.1 * Math.max(1, Math.ceil(ref.weight / (50 * 1024))));
    case "audio":
      return 0.5;
    case "video":
      return 1;
  }
}

/** Two decimals, so 0.1 × 3 is 0.3 and not 0.30000000000000004 on a price tag. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Helpers shared by both sides                                        */
/* ------------------------------------------------------------------ */

/** A base64 payload of n chars decodes to 3n/4 bytes, minus the `=` padding. */
export function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/** Wraps a picture data URL (or a signed storage URL) as an attachment. */
export function imageAttachment(url: string, name = ""): Attachment {
  return { kind: "image", name, mime: "image/jpeg", data: url, size: url.startsWith("data:") ? dataUrlBytes(url) : 0 };
}

/** "1,2 MB" / "10 MB" / "340 KB" / "12 KB metin" — the figure on a chip, and in a limit message. */
export function formatSize(a: Pick<Attachment, "kind" | "size">): string {
  const n = a.size;
  const mb = n / (1024 * 1024);
  const label = n >= 1024 * 1024 ? `${(mb >= 10 ? Math.round(mb).toString() : mb.toFixed(1)).replace(/\.0$/, "").replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
  return a.kind === "text" ? `${label} metin` : label;
}

/** "görsel, PDF, metin, ses ya da video" — what a model takes, for a message. */
export function kindList(kinds: readonly AttachmentKind[]): string {
  const labels = KIND_ORDER.filter((k) => kinds.includes(k)).map((k) => KIND_LABEL[k]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} ya da ${labels[labels.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Server-side validation                                              */
/* ------------------------------------------------------------------ */

const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/;

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Control characters and the few that could break out of a filename in a
  // content part or a <dosya> tag; the length cap is for the transcript.
  return raw.replace(/[\u0000-\u001f\u007f<>"\\]/g, "").trim().slice(0, 120);
}

/**
 * One attachment as it came off the wire → a trusted one, or null.
 *
 * Kind must be one the tool takes; the payload must be a well-formed data
 * URL whose MIME is on the kind's short whitelist and whose decoded size is
 * under the kind's ceiling. A PDF must also start with `%PDF` (base64
 * "JVBER"), so a renamed executable never reaches a parser. Text is checked
 * for length and stripped of NULs. `size` is recomputed, never trusted.
 */
export function sanitizeAttachment(raw: unknown, allowed: readonly AttachmentKind[]): Attachment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (typeof kind !== "string" || !allowed.includes(kind as AttachmentKind)) return null;
  if (typeof r.data !== "string") return null;
  const name = cleanName(r.name);

  if (kind === "text") {
    if (r.data.length > ATTACHMENT_LIMITS.text) return null;
    const data = r.data.replace(/\u0000/g, "");
    if (!data.trim()) return null;
    return { kind, name, mime: "text/plain", data, size: data.length };
  }

  const m = DATA_URL_RE.exec(r.data);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const size = dataUrlBytes(r.data);
  if (size <= 0 || size > ATTACHMENT_LIMITS[kind as AttachmentKind]) return null;

  switch (kind) {
    case "image":
      return IMAGE_MIMES.has(mime) ? { kind, name, mime, data: r.data, size } : null;
    case "document":
      return mime === "application/pdf" && b64.startsWith("JVBER") ? { kind, name, mime, data: r.data, size } : null;
    case "audio":
      return AUDIO_FORMAT_BY_MIME[mime] && AUDIO_MIME_BY_FORMAT[AUDIO_FORMAT_BY_MIME[mime]] === mime ? { kind, name, mime, data: r.data, size } : null;
    case "video":
      return VIDEO_MIMES.has(mime) ? { kind, name, mime, data: r.data, size } : null;
    default:
      return null;
  }
}

/**
 * Anything that fails validation is dropped rather than 400'd — a student
 * shouldn't lose a typed message because one of three files came through
 * malformed. Order is kept (it decides first/last frame on a video tool) and
 * the list is cut to the tool's budget.
 */
export function sanitizeAttachments(raw: unknown, allowed: readonly AttachmentKind[], budget: number): Attachment[] {
  if (!Array.isArray(raw) || budget <= 0) return [];
  const out: Attachment[] = [];
  for (const item of raw) {
    const a = sanitizeAttachment(item, allowed);
    if (a) out.push(a);
    if (out.length >= budget) break;
  }
  return out;
}
