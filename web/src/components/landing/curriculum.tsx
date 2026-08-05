import { Reveal } from "@/components/ui/reveal";

const gridSpan: Record<string, string> = {
  web: "nl-cap-web",
  avatar: "nl-cap-avatar",
  oyun: "nl-cap-oyun",
  afis: "nl-cap-afis",
  muzik: "nl-cap-muzik",
  video: "nl-cap-video",
};

function CardShell({
  cap,
  children,
  outputNo,
  title,
  desc,
  titleSize,
}: {
  cap: string;
  children: React.ReactNode;
  outputNo: string;
  title: string;
  desc: string;
  titleSize: string;
}) {
  return (
    <Reveal className={gridSpan[cap]}>
      <article style={{ background: "var(--paper2)", border: "1px solid #d8cbae", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        {children}
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11, letterSpacing: ".16em", color: "var(--amber-dark)", marginBottom: 9 }}>{outputNo}</div>
          <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: titleSize, color: "var(--navy)", marginBottom: 7 }}>{title}</h3>
          <p style={{ fontSize: "1rem", lineHeight: 1.5, color: "var(--ink-soft)", margin: 0 }}>{desc}</p>
        </div>
      </article>
    </Reveal>
  );
}

export function Curriculum() {
  return (
    <section
      id="ne-uretiyor"
      data-navtheme="light"
      style={{
        background: "var(--paper)",
        backgroundImage:
          "linear-gradient(rgba(35,33,28,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(35,33,28,.045) 1px,transparent 1px)",
        backgroundSize: "34px 34px",
        padding: "clamp(64px,8vw,120px) clamp(18px,5vw,64px)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 720, marginBottom: "clamp(38px,5vw,60px)" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".2em", color: "var(--ink-soft)", marginBottom: 16 }}>01 — NE ÜRETİYOR</div>
          <h2
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 800,
              fontStretch: "125%",
              letterSpacing: "-.02em",
              lineHeight: 1,
              fontSize: "clamp(2rem,5.2vw,3.6rem)",
              color: "var(--navy)",
              marginBottom: 18,
              textWrap: "balance",
            }}
          >
            Ders bitince elinde
            <br />
            gerçek bir şey kalıyor.
          </h2>
          <p style={{ fontSize: "clamp(1rem,1.4vw,1.15rem)", lineHeight: 1.55, color: "var(--ink-soft)", maxWidth: 560 }}>
            Soyut bir &ldquo;yapay zeka farkındalığı&rdquo; değil. Yayınlanabilir, paylaşılabilir, arkadaşına gösterilebilir altı somut çıktı.
          </p>
        </div>

        <div className="nl-caps" style={{ display: "grid", gap: 16 }}>
          <CardShell cap="web" outputNo="ÇIKTI 01" title="Kendi web sitesi" desc="Fikrini yazıyor, yapay zekayla tasarlıyor, canlı bir adreste yayınlıyor. Linki ailesine gönderiyor." titleSize="clamp(1.4rem,2.4vw,2rem)">
            <div style={{ background: "var(--navy)", padding: "26px 26px 0", minHeight: 170, position: "relative" }}>
              <div style={{ background: "#fff", borderRadius: "10px 10px 0 0", padding: 14, boxShadow: "0 -2px 0 rgba(0,0,0,.15)" }}>
                <div style={{ height: 12, width: "44%", background: "var(--amber)", borderRadius: 3, marginBottom: 9 }} />
                <div style={{ height: 8, width: "78%", background: "#d8cbae", borderRadius: 3, marginBottom: 6 }} />
                <div style={{ height: 8, width: "60%", background: "#e4d9c0", borderRadius: 3, marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, height: 32, background: "#eee3c9", borderRadius: 5 }} />
                  <div style={{ flex: 1, height: 32, background: "#eee3c9", borderRadius: 5 }} />
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell cap="avatar" outputNo="ÇIKTI 02" title="Konuşan 3D avatar" desc="Kendi karakterini tasarlıyor, sesini ve hareketini veriyor; ekranda gerçekten konuşuyor." titleSize="clamp(1.3rem,2.2vw,1.7rem)">
            <div
              style={{
                background: "repeating-linear-gradient(135deg,#1b2a52 0 14px,#152343 14px 28px)",
                minHeight: 170,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--amber)", border: "3px solid #fff" }} />
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 26 }}>
                {[45, 90, 60, 100, 40].map((h, i) => (
                  <span key={i} style={{ width: 5, height: `${h}%`, background: i === 2 ? "var(--amber)" : "var(--on-navy-soft)", borderRadius: 2 }} />
                ))}
              </div>
            </div>
          </CardShell>

          <CardShell cap="oyun" outputNo="ÇIKTI 03" title="Oyun" desc="Kuralını kendi kuruyor, oynanabilir bir oyun çıkıyor." titleSize="clamp(1.2rem,2vw,1.5rem)">
            <div style={{ background: "#0f1c3a", minHeight: 150, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 18, bottom: 24, width: 50, height: 11, background: "#3a4d78", borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 92, bottom: 56, width: 50, height: 11, background: "#3a4d78", borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 30, bottom: 38, width: 20, height: 20, background: "var(--amber)", transform: "rotate(45deg)", borderRadius: 4 }} />
              <div style={{ position: "absolute", right: 26, top: 22, width: 11, height: 11, background: "#f0d38a", borderRadius: "50%" }} />
            </div>
          </CardShell>

          <CardShell cap="afis" outputNo="ÇIKTI 04" title="Afiş & görsel" desc="Baskıya hazır afişler, kapaklar, illüstrasyonlar üretiyor." titleSize="clamp(1.2rem,2vw,1.5rem)">
            <div style={{ background: "var(--amber)", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px 22px" }}>
              <span style={{ fontFamily: "var(--font-plex-mono)", fontSize: 10.5, letterSpacing: ".16em", color: "#F5F7FF" }}>SERGİ · 2026</span>
              <span style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "clamp(1.4rem,3.2vw,2rem)", lineHeight: 0.9, color: "#F5F7FF" }}>
                RENK
                <br />
                ATÖLYESİ
              </span>
            </div>
          </CardShell>

          <CardShell cap="muzik" outputNo="ÇIKTI 05" title="Müzik & şarkı" desc="Kendi sözünü ve melodisini yapıyor, dinlenebilir bir parça çıkıyor." titleSize="clamp(1.2rem,2vw,1.5rem)">
            <div style={{ background: "var(--navy)", minHeight: 150, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 5, padding: 24 }}>
              {[30, 70, 45, 95, 60, 80, 38].map((h, i) => (
                <span key={i} style={{ width: 7, height: `${h}%`, background: i === 2 || i === 4 ? "var(--amber)" : "var(--on-navy-soft)", borderRadius: 3 }} />
              ))}
            </div>
          </CardShell>

          <Reveal className="nl-cap-video">
            <article style={{ background: "var(--paper2)", border: "1px solid #d8cbae", borderRadius: 14, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr", alignItems: "stretch" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
                <div
                  style={{
                    background: "repeating-linear-gradient(90deg,#152343 0 3px,#1b2a52 3px 6px)",
                    minHeight: 150,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div style={{ width: 0, height: 0, borderLeft: "26px solid var(--amber)", borderTop: "17px solid transparent", borderBottom: "17px solid transparent" }} />
                  <span style={{ position: "absolute", left: 16, top: 14, fontFamily: "var(--font-plex-mono)", fontSize: 10.5, letterSpacing: ".14em", color: "var(--on-navy-soft)" }}>
                    00:00 / 01:12
                  </span>
                </div>
                <div style={{ padding: "24px 26px 26px" }}>
                  <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11, letterSpacing: ".16em", color: "var(--amber-dark)", marginBottom: 10 }}>ÇIKTI 06</div>
                  <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "clamp(1.4rem,2.6vw,2rem)", color: "var(--navy)", marginBottom: 8 }}>
                    Video &amp; kısa film
                  </h3>
                  <p style={{ fontSize: "1rem", lineHeight: 1.5, color: "var(--ink-soft)", margin: 0, maxWidth: 640 }}>
                    Senaryosunu yazıyor, sahnelerini üretiyor, kurgusunu birleştiriyor. Sonunda paylaşılabilir bir kısa film.
                  </p>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
