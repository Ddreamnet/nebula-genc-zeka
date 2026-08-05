import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/landing/legal-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gizlilik ve Çerez Politikası",
  description: "Nebula Genç Zeka gizlilik ve çerez politikası.",
};

export default function GizlilikPage() {
  return (
    <LegalPage eyebrow="GİZLİLİK" title="Gizlilik ve Çerez Politikası" updated="Temmuz 2026">
      <h2>1. Giriş</h2>
      <p>
        {siteConfig.name} olarak ({siteConfig.url}), sitemizi ve öğrenci panelini kullanan veliler ve öğrencilerin
        gizliliğine önem veriyoruz. Bu politika, hangi bilgileri topladığımızı, bunları nasıl kullandığımızı ve
        çerezleri nasıl yönettiğimizi açıklar. KVKK kapsamındaki haklarınız için{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;ni inceleyebilirsiniz.
      </p>

      <h2>2. Topladığımız Bilgiler</h2>
      <ul>
        <li>Instagram/WhatsApp üzerinden bizimle iletişime geçtiğinizde paylaştığınız ad, e-posta ve telefon bilgileri</li>
        <li>Öğrenci paneli hesabı oluşturulurken kaydedilen e-posta, ders ve ilerleme bilgileri</li>
        <li>Playground (yapay zeka deneme alanı) üzerindeki kullanımınıza ait kredi ve üretim kayıtları</li>
        <li>Cihaz, tarayıcı ve IP adresi gibi teknik bilgiler</li>
      </ul>

      <h2>3. Bilgilerin Kullanımı</h2>
      <p>
        Bu bilgileri; eğitim hizmetimizi sunmak, sizinle iletişim kurmak, öğrenci panelinin ve Playground&apos;ın
        güvenli çalışmasını sağlamak, hizmetimizi geliştirmek ve yasal yükümlülüklerimizi yerine getirmek için
        kullanırız. Bilgileriniz hiçbir şekilde satılmaz veya pazarlama amacıyla üçüncü taraflarla paylaşılmaz.
      </p>

      <h2 id="cerezler">4. Çerezler</h2>
      <p>
        Şu anda yalnızca öğrenci paneli oturumunuzu açık tutmak ve hesabınızın güvenliğini sağlamak için gerekli olan{" "}
        <strong>zorunlu çerezleri</strong> kullanıyoruz. Reklam veya üçüncü taraf takip çerezi kullanmıyoruz. İleride
        analiz amaçlı çerez eklenmesi halinde bu politika güncellenecektir.
      </p>

      <h2>5. Üçüncü Taraf Hizmetler</h2>
      <p>
        Altyapımız için Supabase (veritabanı ve kimlik doğrulama) ve Vercel (barındırma) hizmetlerini; Playground&apos;da
        seçtiğiniz modele göre OpenRouter üzerinden ilgili yapay zeka sağlayıcısını kullanıyoruz. Bu sağlayıcılar
        yalnızca hizmeti çalıştırmak için gerekli veriye, gerektiği kadar erişebilir.
      </p>

      <h2>6. Çocukların Gizliliği</h2>
      <p>
        Nebula, {siteConfig.ageRange} arasındaki öğrenciler için tasarlanmıştır. Öğrenci hesapları veli/eğitmen bilgisi
        ve gözetiminde oluşturulur; öğrencilerden doğrudan, veli onayı olmadan pazarlama amaçlı veri toplanmaz.
      </p>

      <h2>7. Veri Güvenliği</h2>
      <p>
        Kişisel verileriniz, yetkisiz erişime karşı sektör standardı güvenlik önlemleriyle (şifreli bağlantı, erişim
        kontrolü) korunur. Yine de internet üzerinden hiçbir aktarımın %100 güvenli olmadığını hatırlatırız.
      </p>

      <h2>8. Politika Değişiklikleri</h2>
      <p>
        Bu politikayı zaman zaman güncelleyebiliriz; güncel sürüm her zaman bu sayfada yayınlanır.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Sorularınız için <Link href={`mailto:${siteConfig.email}`}>{siteConfig.email}</Link> adresinden bize
        ulaşabilirsiniz.
      </p>
    </LegalPage>
  );
}
