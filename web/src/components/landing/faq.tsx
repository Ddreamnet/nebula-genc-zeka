const faqs = [
  {
    q: "Çocuğumun önceden kodlama bilmesi gerekiyor mu?",
    a: "Hayır, hiç gerekmiyor. Programa sıfırdan başlayan öğrencilerle çalışıyoruz. Amacımız kod ezberletmek değil; çocuğunuzun aklındaki bir fikri yapay zekayla adım adım gerçek bir ürüne dönüştürebilmesi. İlk dersten itibaren kendi çıktısını üretmeye başlıyor.",
  },
  {
    q: "Dersler nerede yapılıyor?",
    a: "Dersler tamamen canlı ve online. Çocuğunuz evden, kendi bilgisayarından katılıyor; öğretmen ekranını paylaşarak aynı anda birlikte çalışıyor. Bir merkeze gitmeye gerek yok — bir bilgisayar ve internet bağlantısı yeterli.",
  },
  {
    q: "Yapay zeka araçları için ayrıca ödeme yapacak mıyım?",
    a: "Hayır. 100'den fazla yapay zeka aracına öğrenci panelinden erişim programa dahildir. Ayrı ayrı üyelik açmanıza, kart bilgisi girmenize veya ek abonelik ödemenize gerek yok; hepsi tek panelde ve öğretmen gözetiminde.",
  },
  {
    q: "10 yaşındaki çocuk için de, 18 yaşındaki için de uygun mu?",
    a: "Evet. Gruplar iki kişilik ve yaşa göre oluşturuluyor — 10 yaşındaki bir öğrenci 18 yaşındaki biriyle aynı grupta olmuyor. İçerik de her yaş grubunun seviyesine göre ayarlanıyor; herkes kendi hızında, yapabileceğinin bir adım ötesinde çalışıyor — kimse sıkılmıyor, kimse geride kalmıyor.",
  },
];

export function Faq() {
  return (
    <div className="nl-faq" style={{ display: "grid", gap: 10, maxWidth: 820 }}>
      {faqs.map((f) => (
        <details key={f.q} style={{ background: "var(--paper2)", border: "1px solid #d8cbae", borderRadius: 12, padding: "4px 4px" }}>
          <summary
            style={{
              padding: "18px 20px",
              fontFamily: "var(--font-plex-sans)",
              fontWeight: 600,
              fontSize: "1.05rem",
              color: "var(--navy)",
            }}
          >
            {f.q}
          </summary>
          <div style={{ padding: "0 20px 18px", fontSize: "1rem", lineHeight: 1.55, color: "var(--ink-soft)" }}>{f.a}</div>
        </details>
      ))}
    </div>
  );
}
