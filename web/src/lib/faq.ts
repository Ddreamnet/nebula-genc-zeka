/**
 * The parent-facing FAQ.
 *
 * Ordered by when the question actually gets asked, not by how comfortable it
 * is to answer.
 *
 * Price is deliberately not one of the questions — the figures came off the
 * site in Aug 2026 and are given per family over WhatsApp instead. They still
 * live in siteConfig.pricing, so putting the question back is one entry here,
 * not a number pasted into a component. The commitment answer stays, because
 * "can I stop" is the worry underneath it.
 *
 * The data lives in lib/ rather than inside the component because two things
 * consume it: the <Faq> accordion, and the FAQPage JSON-LD the homepage emits
 * (lib/seo.tsx → faqLd). Google requires the marked-up Q&A to be the same text
 * the visitor can see, so they have to read from one array — not two copies
 * that drift apart the first time an answer is reworded.
 */
export const faqs = [
  {
    q: "Çocuğumun önceden kodlama bilmesi gerekiyor mu?",
    a: "Hayır, hiç gerekmiyor. Programa sıfırdan başlayan öğrencilerle çalışıyoruz. Amacımız kod ezberletmek değil; çocuğunuzun aklındaki bir fikri yapay zekayla adım adım gerçek bir ürüne dönüştürebilmesi. İlk dersten itibaren kendi çıktısını üretmeye başlıyor.",
  },
  {
    q: "Dersler nerede yapılıyor?",
    a: "Dersler tamamen canlı ve online. Çocuğunuz evden, kendi bilgisayarından katılıyor; öğretmen ekranını paylaşarak aynı anda birlikte çalışıyor. Bir merkeze gitmeye gerek yok: bir bilgisayar ve internet bağlantısı yeterli.",
  },
  {
    q: "Yapay zeka araçları için ayrıca ödeme yapacak mıyım?",
    a: "Hayır. 100'den fazla yapay zeka aracına öğrenci panelinden erişim programa dahildir. Ayrı ayrı üyelik açmanıza, kart bilgisi girmenize veya ek abonelik ödemenize gerek yok; hepsi tek panelde. Derslerde öğretmen eşliğinde kullanılıyor, ders dışında da öğrencinin kendi kullanım hakkı oluyor.",
  },
  {
    q: "Taahhüt var mı, istediğim zaman bırakabilir miyim?",
    a: "Taahhüt yok. Aylık ödeyerek başlayabilir, devam etmek istemezseniz bırakabilirsiniz. Zaten ilk ders ücretsiz: kimse görmeden karar vermek zorunda değil.",
  },
  {
    q: "Zaten ekran başında çok vakit geçiriyor. Neden buna da vakit ayırayım?",
    a: "Haklısınız, zaten fazla. Fark şurada: burada ekranı izlemiyor, ekranda bir şey yapıyor. Haftada 80 dakika, ve sonunda ortada gösterilecek bir iş var. Bunu ekran süresine ekleme değil, bir kısmının yerine koyma olarak düşünün.",
  },
  {
    q: "Çocuğum çekingen. Derste zorlanır mı?",
    a: "Ders birebir: ekranın karşısında çocuğunuz ve öğretmeni var, başka kimse yok. Kalabalıkta elini kaldıramayan bir çocuk burada soru sormaktan da, yanlış yapmaktan da çekinmiyor. İlk ders zaten ücretsiz; çocuğunuz denedikten sonra karar verirsiniz.",
  },
  {
    q: "10 yaşındaki çocuk için de, 18 yaşındaki için de uygun mu?",
    a: "Evet. Dersler birebir olduğu için içeriği doğrudan o çocuğa göre kuruyoruz; 10 yaşındakiyle 18 yaşındakinin dersi aynı ders değil. Herkes kendi hızında, yapabileceğinin bir adım ötesinde çalışıyor. Kimse sıkılmıyor, kimse geride kalmıyor.",
  },
] as const;
