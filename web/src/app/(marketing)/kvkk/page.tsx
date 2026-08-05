import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/landing/legal-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Nebula Genç Zeka kişisel verilerin korunması aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <LegalPage eyebrow="KİŞİSEL VERİLERİN KORUNMASI" title="KVKK Aydınlatma Metni" updated="Temmuz 2026">
      <h2>1. Veri Sorumlusu</h2>
      <p>
        {siteConfig.name} (&quot;Nebula&quot;) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
        kapsamında veri sorumlusu sıfatıyla, sizinle ve/veya velisi olduğunuz öğrenciyle ilgili kişisel verileri bu
        aydınlatma metninde açıklanan amaç ve kapsamla sınırlı olarak işliyoruz.
      </p>

      <h2>2. Toplanan Kişisel Veriler</h2>
      <ul>
        <li><strong>Kimlik ve iletişim bilgileri:</strong> veli/öğrenci ad-soyad, e-posta, telefon numarası</li>
        <li><strong>Öğrenciye ilişkin bilgiler:</strong> yaş, ders programı, ödev ve ilerleme kayıtları</li>
        <li><strong>Hesap bilgileri:</strong> öğrenci paneli e-posta/şifre bilgisi ve oturum kayıtları</li>
        <li><strong>Playground kullanım verileri:</strong> deneme alanında yapılan üretimler ve harcanan kredi (&quot;cevher&quot;) miktarı</li>
        <li><strong>Teknik veriler:</strong> IP adresi, cihaz/tarayıcı bilgisi ve zorunlu çerezler</li>
      </ul>

      <h2>3. İşlenme Amaçları</h2>
      <ul>
        <li>Eğitim hizmetinin planlanması, yürütülmesi ve ders/ödev takibinin yapılması</li>
        <li>Veli ve öğrenci ile iletişim kurulması</li>
        <li>Öğrenci paneli hesabının oluşturulması ve güvenliğinin sağlanması</li>
        <li>Playground&apos;daki yapay zeka araçlarının çalıştırılması ve kötüye kullanımın önlenmesi</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
      </ul>

      <h2>4. Kişisel Verilerin Aktarıldığı Taraflar</h2>
      <p>
        Verileriniz; barındırma ve veritabanı altyapımızı sağlayan hizmet sağlayıcılarla (Supabase, Vercel), yalnızca
        siz bir üretim talebinde bulunduğunuzda ilgili yapay zeka sağlayıcısıyla (OpenRouter üzerinden, seçtiğiniz
        modelle sınırlı olarak) ve yasal olarak talep etmeye yetkili kamu kurum ve kuruluşlarıyla paylaşılabilir.
      </p>

      <h2>5. Toplama Yöntemi ve Hukuki Sebebi</h2>
      <p>
        Kişisel verileriniz; web sitemiz, öğrenci paneli ve Instagram/WhatsApp üzerinden doğrudan sizden, KVKK
        m.5/2&apos;de sayılan sözleşmenin kurulması/ifası, hukuki yükümlülüğün yerine getirilmesi, meşru menfaat ve
        gerektiğinde açık rızanız hukuki sebeplerine dayanılarak toplanır.
      </p>

      <h2>6. KVKK m.11 Kapsamındaki Haklarınız</h2>
      <p>İlgili kişi sıfatıyla bize başvurarak:</p>
      <ul>
        <li>kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
        <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>yurt içinde/dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK m.7 şartları oluştuğunda silinmesini veya yok edilmesini isteme ve bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
        <li>münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
        <li>kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
      </ul>
      <p>haklarına sahipsiniz.</p>

      <h2>7. Başvuru Yöntemi</h2>
      <p>
        Yukarıdaki haklarınızı kullanmak için{" "}
        <Link href={`mailto:${siteConfig.email}`}>{siteConfig.email}</Link> adresine yazılı olarak başvurabilirsiniz.
        Talebiniz, niteliğine göre en kısa sürede ve en geç yasal süresi içinde sonuçlandırılır.
      </p>
    </LegalPage>
  );
}
