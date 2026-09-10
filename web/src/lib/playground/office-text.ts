/**
 * Word, Excel and PowerPoint → plain text, in the browser.
 *
 * All three are ZIP archives of XML (OOXML), and the text a student cares
 * about sits in a handful of predictable elements: `w:t` runs in Word,
 * shared strings and cell values in Excel, `a:t` runs in PowerPoint. So the
 * whole thing is a ZIP reader on top of the browser's own
 * `DecompressionStream("deflate-raw")` plus a few regexes over the XML —
 * no dependency, no worker, nothing sent anywhere.
 *
 * Deliberately regex rather than DOMParser: the elements are flat and
 * regular, entities are the only decoding needed, and it keeps this module
 * runnable under plain Node for tests. Layout is not preserved (a table
 * becomes one paragraph per cell); what is preserved is every word, in
 * document order, which is what a model needs to answer questions about it.
 */
import type { OfficeKind } from "./attachments";

/* ------------------------------------------------------------------ */
/* ZIP                                                                 */
/* ------------------------------------------------------------------ */

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readEntries(view: DataView): ZipEntry[] {
  // The end-of-central-directory record sits at the very end, after a
  // comment of up to 64 KB. Scan back for its signature.
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("not a zip");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== SIG_CENTRAL) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLength));
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lazily-read archive: entries are listed up front, inflated only when asked for. */
export class ZipReader {
  private readonly buffer: ArrayBuffer;
  private readonly view: DataView;
  private readonly entries: Map<string, ZipEntry>;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.entries = new Map(readEntries(this.view).map((e) => [e.name, e]));
  }

  names(): string[] {
    return [...this.entries.keys()];
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  async text(name: string): Promise<string | null> {
    const entry = this.entries.get(name);
    if (!entry) return null;
    const h = entry.localOffset;
    if (h + 30 > this.view.byteLength || this.view.getUint32(h, true) !== SIG_LOCAL) return null;
    const nameLength = this.view.getUint16(h + 26, true);
    const extraLength = this.view.getUint16(h + 28, true);
    const start = h + 30 + nameLength + extraLength;
    const raw = new Uint8Array(this.buffer, start, Math.min(entry.compressedSize, this.view.byteLength - start));
    const bytes = entry.method === 8 ? await inflateRaw(raw) : entry.method === 0 ? raw : null;
    return bytes ? new TextDecoder().decode(bytes) : null;
  }
}

/* ------------------------------------------------------------------ */
/* XML bits                                                            */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code] ?? whole;
  });
}

/** Every `<tag …>inner</tag>` in order, inner text only, entities decoded. */
function innerTexts(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeEntities(m[1]));
  return out;
}

/** Every `<tag …>…</tag>` block (outer), non-greedy, in order. */
function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function attr(tagXml: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tagXml);
  return m ? decodeEntities(m[1]) : null;
}

function tidy(lines: string[]): string {
  return lines
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Word                                                                */
/* ------------------------------------------------------------------ */

export function docxText(documentXml: string): string {
  // One line per paragraph. Tabs and soft breaks are the only inline
  // structure worth keeping; everything else (runs, formatting) is noise.
  const paragraphs = documentXml.split(/<\/w:p>/);
  const lines = paragraphs.map((p) => {
    // A tab or break sits between runs, outside any <w:t>; rewriting it as
    // a run of its own keeps it in sequence with the words around it.
    const withBreaks = p.replace(/<w:tab\s*\/>/g, "<w:t>\t</w:t>").replace(/<w:(?:br|cr)\s*\/>/g, "<w:t>\n</w:t>");
    return innerTexts(withBreaks, "w:t").join("");
  });
  return tidy(lines);
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    if (ch < "A" || ch > "Z") break;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return Math.max(0, n - 1);
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One worksheet → CSV lines, shared strings resolved. */
export function sheetCsv(sheetXml: string, sharedStrings: string[]): string {
  const rows = blocks(sheetXml, "row");
  const lines: string[] = [];
  const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (const row of rows) {
    const cells: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = cellRe.exec(row))) {
      const attrs = m[1];
      const inner = m[2] ?? "";
      const col = columnIndex(attr(attrs, "r") ?? "");
      const type = attr(attrs, "t");
      let value = "";
      if (type === "s") {
        const idx = Number(innerTexts(inner, "v")[0] ?? "");
        value = sharedStrings[idx] ?? "";
      } else if (type === "inlineStr") {
        value = innerTexts(inner, "t").join("");
      } else {
        value = innerTexts(inner, "v")[0] ?? "";
        if (type === "b") value = value === "1" ? "TRUE" : "FALSE";
      }
      while (cells.length < col) cells.push("");
      cells[col] = value;
    }
    if (cells.some((c) => c !== "")) lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\n");
}

export function sharedStringsOf(xml: string | null): string[] {
  if (!xml) return [];
  // A shared string is one <si>, which may hold several <t> runs (rich text).
  return blocks(xml, "si").map((si) => innerTexts(si, "t").join(""));
}

async function xlsxText(zip: ZipReader): Promise<string> {
  const shared = sharedStringsOf(await zip.text("xl/sharedStrings.xml"));

  // Sheet names come from the workbook, and the workbook points at sheet
  // files through its relationships part — two hops for a human name.
  const workbook = (await zip.text("xl/workbook.xml")) ?? "";
  const rels = (await zip.text("xl/_rels/workbook.xml.rels")) ?? "";
  const targetById = new Map<string, string>();
  for (const rel of workbook ? rels.match(/<Relationship\s[^>]*\/?>/g) ?? [] : []) {
    const id = attr(rel, "Id");
    const target = attr(rel, "Target");
    if (id && target) targetById.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets: { name: string; path: string }[] = [];
  for (const sheet of workbook.match(/<sheet\s[^>]*\/?>/g) ?? []) {
    const name = attr(sheet, "name") ?? "";
    const id = attr(sheet, "r:id");
    const path = id ? targetById.get(id) : undefined;
    if (path && zip.has(path)) sheets.push({ name, path });
  }
  if (sheets.length === 0) {
    // No usable workbook part: fall back to the sheet files in numeric order.
    const paths = zip
      .names()
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    paths.forEach((path, i) => sheets.push({ name: `Sayfa${i + 1}`, path }));
  }

  const parts: string[] = [];
  for (const sheet of sheets) {
    const csv = sheetCsv((await zip.text(sheet.path)) ?? "", shared);
    if (!csv) continue;
    parts.push(sheets.length > 1 ? `## ${sheet.name}\n${csv}` : csv);
  }
  return parts.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* PowerPoint                                                          */
/* ------------------------------------------------------------------ */

export function slideText(slideXml: string): string {
  const paragraphs = blocks(slideXml, "a:p").map((p) => innerTexts(p, "a:t").join(""));
  return tidy(paragraphs.filter((p) => p.trim().length > 0));
}

async function pptxText(zip: ZipReader): Promise<string> {
  const slides = zip
    .names()
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const parts: string[] = [];
  for (const [i, path] of slides.entries()) {
    const text = slideText((await zip.text(path)) ?? "");
    parts.push(`--- Slayt ${i + 1} ---\n${text || "(boş)"}`);
  }
  return parts.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * The text of an Office file, or "" when it holds none. Throws when the
 * bytes are not a ZIP at all — the caller turns that into "bu dosya
 * açılamadı".
 */
export async function officeText(buffer: ArrayBuffer, kind: OfficeKind): Promise<string> {
  const zip = new ZipReader(buffer);
  if (kind === "docx") return docxText((await zip.text("word/document.xml")) ?? "");
  if (kind === "xlsx") return xlsxText(zip);
  return pptxText(zip);
}
