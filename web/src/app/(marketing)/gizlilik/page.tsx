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
    <LegalPage eyebrow="GİZLİLİK" title="Gizlilik ve Çerez Politikası" updated="Ağustos 2026">
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
        Öğrenci paneli oturumunuzu açık tutmak ve hesabınızın güvenliğini sağlamak için{" "}
        <strong>zorunlu çerezler</strong> kullanıyoruz. Bu çerezler olmadan giriş yapılamaz.
      </p>
      <p>
        Ayrıca sitenin nasıl kullanıldığını anlamak ve reklam performansını ölçmek için{" "}
        <strong>ölçümleme ve pazarlama çerezleri</strong> kullanıyoruz: Google Analytics (ziyaret istatistikleri) ve
        Meta Pixel (Instagram/Facebook reklamlarının ölçümü). Bu çerezler ziyaretinize dair istatistiksel bilgi ve
        cihaz/tarayıcı bilgisi toplar; öğrenci panelindeki ders, ödev veya Playground içeriğinize erişmez.
      </p>
      <p>
        Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz; zorunlu çerezleri engellemeniz
        halinde öğrenci paneline giriş yapamazsınız.
      </p>

      <h2>5. Üçüncü Taraf Hizmetler ve Yurt Dışına Aktarım</h2>
      <p>
        Altyapımız için GoDaddy (barındırma) ve Supabase (veritabanı, kimlik doğrulama ve dosya depolama)
        hizmetlerini; Playground&apos;da seçtiğiniz modele göre OpenRouter üzerinden ilgili yapay zeka sağlayıcısını
        kullanıyoruz. Bu sağlayıcılar yalnızca hizmeti çalıştırmak için gerekli veriye, gerektiği kadar erişebilir.
      </p>
      <p>
        Bu hizmetlerin sunucuları yurt dışında bulunduğundan, verileriniz hizmetin sunulabilmesi için gereken ölçüde
        yurt dışına aktarılır. Yapay zeka sağlayıcılarına yalnızca siz bir üretim talebinde bulunduğunuzda, o talebin
        içeriğiyle sınırlı bir aktarım yapılır. Ayrıntı için{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;nin 5. bölümüne bakabilirsiniz.
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
