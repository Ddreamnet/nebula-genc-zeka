import { Plus } from "lucide-react";
import { faqs } from "@/lib/faq";

/**
 * The parent-facing FAQ accordion.
 *
 * The questions themselves live in lib/faq.ts — the homepage marks the same
 * array up as FAQPage JSON-LD, and Google requires the structured data and
 * the visible text to match exactly.
 */

export function Faq() {
  return (
    <div className="nb-faq" style={{ display: "grid", gap: 12, maxWidth: 860 }}>
      {faqs.map((f) => (
        <details
          key={f.q}
          className="nb-card"
          style={{ "--tone": "var(--paper-line)" } as React.CSSProperties}
        >
          <summary
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "20px 22px",
              fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
              fontWeight: 500,
              fontSize: "clamp(1.05rem,1.6vw,1.2rem)",
              color: "var(--ink)",
            }}
          >
            {f.q}
            <span
              className="nb-faq__mark"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--amber)",
                border: "var(--stroke) solid var(--stroke-color)",
                color: "var(--ink)",
              }}
            >
              <Plus size={18} strokeWidth={3} />
            </span>
          </summary>
          <p
            style={{
              margin: 0,
              padding: "0 22px 22px",
              fontSize: 16,
              lineHeight: 1.68,
              color: "var(--ink-soft)",
              maxWidth: 720,
            }}
          >
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}
