"use client";

import { isValidElement, memo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Renders a model's answer as markdown.
 *
 * Until now every reply was printed as pre-wrapped plain text, so a model that
 * answered with a heading, a list, a table or a fenced code block — which is
 * how they all answer — put its raw syntax on screen and a student read
 * `**bold**` and stray backticks.
 *
 * Raw HTML stays off. `rehype-raw` is deliberately NOT in the plugin list, so
 * a model that emits `<script>` (or is talked into it) renders it as text
 * rather than as markup. The one place model output is allowed to execute
 * remains the web tool's sandboxed iframe, which has no `allow-same-origin`
 * and therefore no access to the session.
 */

/**
 * Flattens a React subtree back to plain text.
 *
 * Needed because by the time a fenced block reaches us, rehype-highlight has
 * already replaced its text with a tree of coloured `<span>`s — so the node
 * has to be rendered as-is to keep the colours, while the copy button needs
 * the original source. Reading `String(children)` instead yields a row of
 * "[object Object]", which is exactly what a screenshot of the first attempt
 * showed.
 */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return "";
}

/** A fenced block: language label, its own copy button, horizontal scroll. */
function CodeBlock({
  language,
  className,
  children,
}: {
  language: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const code = nodeText(children);

  return (
    <div className="pg-card pg-card--flat my-2 overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant px-2.5 py-1">
        <span className="font-mono text-micro uppercase tracking-wider text-on-surface-variant/70">
          {language ?? "kod"}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Kodu kopyala"
          className="inline-flex size-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-3 font-mono text-micro leading-relaxed">
        {/* The highlighted nodes are rendered untouched; `hljs` is what the
            colour rules in globals.css hang off. */}
        <code className={cn("hljs", className)}>{children}</code>
      </pre>
    </div>
  );
}

/**
 * `pre` is overridden rather than `code` because a fenced block arrives as a
 * `code` inside a `pre`: styling the inner node alone would leave the default
 * `pre` wrapper around our card, and stripping it at the `code` level would
 * also catch inline code.
 */
const COMPONENTS: Components = {
  pre: ({ children }) => <>{children}</>,

  code: ({ className, children, ...props }) => {
    // react-markdown marks a fenced block with `language-*`; anything without
    // it (or without a newline) is inline code inside a sentence.
    const language = /language-(\w+)/.exec(className ?? "")?.[1] ?? null;
    if (!language && !nodeText(children).includes("\n")) {
      return (
        <code className="rounded bg-surface-container px-1 py-0.5 font-mono text-[0.9em] text-secondary-bright" {...props}>
          {children}
        </code>
      );
    }
    return (
      <CodeBlock language={language} className={className}>
        {children}
      </CodeBlock>
    );
  },

  // Links open away from the playground, and `noreferrer` keeps a model-chosen
  // destination from learning where the student came from.
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-secondary underline decoration-secondary/40 underline-offset-2 transition hover:decoration-secondary"
    >
      {children}
    </a>
  ),

  // A wide table has to scroll inside itself; letting it push the bubble wider
  // would break the whole transcript layout on a phone.
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-mini">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-outline-variant bg-surface-container px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-outline-variant px-2 py-1 align-top">{children}</td>,

  h1: ({ children }) => <h1 className="mt-3 mb-1.5 font-display text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-1.5 font-display text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2.5 mb-1 font-display text-sm font-semibold first:mt-0">{children}</h3>,

  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5 marker:text-on-surface-variant/50">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5 marker:text-on-surface-variant/50">{children}</ol>,

  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-secondary/40 pl-3 text-on-surface-variant italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-outline-variant" />,
  // Tight paragraphs: a chat bubble is not an article, and the default
  // top-and-bottom margin doubles the gap between every line of an answer.
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
};

/**
 * Memoised on `content`: a streamed answer re-renders at ~16fps and every one
 * of those passes would otherwise re-parse the markdown from scratch for a
 * bubble whose text has not changed.
 */
export const Markdown = memo(function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("pg-md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // `ignoreMissing` so an unknown language in a fence (or a half-written
        // one mid-stream) renders as plain code instead of throwing.
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
