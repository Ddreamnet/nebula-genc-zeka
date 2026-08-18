"use client";

/**
 * Last-resort boundary: this one replaces the ROOT layout, so it renders its
 * own <html>/<body> and cannot rely on the fonts, CSS variables or stylesheets
 * that layout normally provides — every style here is deliberately inline and
 * self-contained. It only ever shows when the root layout itself failed.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#152343",
          color: "#EFE7D6",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 12px" }}>
            Beklenmedik bir hata oluştu
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.55, color: "#A9B6D4", margin: "0 0 28px" }}>
            Sayfayı yenilemeyi deneyin. Sorun sürerse Instagram ya da WhatsApp&apos;tan bize yazın.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#3D5FE0",
              color: "#F5F7FF",
              border: "none",
              borderRadius: 11,
              padding: "15px 26px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 5px 0 #26399E",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
