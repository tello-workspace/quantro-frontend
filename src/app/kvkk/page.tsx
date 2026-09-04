import type { Metadata } from 'next';
import Link from 'next/link';

import LegalPage, { Bolum, P, Liste, Tablo } from '@/features/legal/components/LegalPage';
import { VERI_SORUMLUSU, SON_GUNCELLEME } from '@/features/legal/veri-sorumlusu';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — Quantro',
  description:
    'Quantro’da hangi kişisel verilerin işlendiği, hangi amaçla ve hangi hukuki sebebe dayanılarak işlendiği, kimlere aktarıldığı ve veri sahibi hakları.',
};

export default function KvkkPage() {
  return (
    <LegalPage
      title="KVKK Aydınlatma Metni"
      ozet="6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca, Quantro’yu kullanırken hangi kişisel verilerinizin işlendiğini, bunların neden ve hangi hukuki sebeple işlendiğini, kimlere aktarıldığını ve haklarınızı açıklar."
      sonGuncelleme={SON_GUNCELLEME}
    >
      <Bolum baslik="1. Veri sorumlusu">
        <P>
          Kişisel verileriniz, veri sorumlusu sıfatıyla {VERI_SORUMLUSU.unvan} tarafından aşağıda
          açıklanan kapsamda işlenmektedir. Başvuru ve talepleriniz için:{' '}
          <a
            href={`mailto:${VERI_SORUMLUSU.eposta}`}
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            {VERI_SORUMLUSU.eposta}
          </a>
          .
        </P>
      </Bolum>

      <Bolum baslik="2. İşlenen kişisel veriler">
        <P>
          Quantro yalnızca hizmetin çalışması için gereken verileri toplar. Aşağıdaki tabloda
          “isteğe bağlı” olarak işaretlenen alanları hiç doldurmadan da uygulamayı
          kullanabilirsiniz.
        </P>
        <Tablo
          basliklar={['Veri kategorisi', 'İçerdiği veriler', 'Zorunlu mu?']}
          satirlar={[
            ['Kimlik', 'Ad soyad', 'Zorunlu'],
            ['İletişim', 'E-posta adresi', 'Zorunlu'],
            [
              'Hesap güvenliği',
              'Parolanızın bcrypt ile üretilmiş özeti (parolanın kendisi saklanmaz), e-posta doğrulama ve parola sıfırlama jetonları, oluşturduğunuz API jetonlarının özetleri',
              'Zorunlu',
            ],
            [
              'Profil',
              'Unvan, biyografi, deneyim, GitHub ve LinkedIn adresi, GitHub kullanıcı adı, şirket, konum, uzmanlık alanları, bildiğiniz diller, profil görseli',
              'İsteğe bağlı',
            ],
            [
              'Tercihler',
              'Arayüz dili, tema tercihi, günlük özet e-postası tercihi, bildirim tercihleri',
              'İsteğe bağlı',
            ],
            [
              'Kullanım ve işlem',
              'Oluşturduğunuz projeler, kartlar, yorumlar, kontrol listeleri, zaman kayıtları, aktivite geçmişi, bildirimler, organizasyon içi mesajlar ve ekleri, yüklediğiniz belgeler',
              'Kullanıma bağlı',
            ],
            [
              'Teknik',
              'IP adresiniz (yalnızca istek sınırlama ve kötüye kullanım önleme amacıyla, geçici olarak bellekte), hata kayıtları',
              'Zorunlu',
            ],
            [
              'Yapay zekâ ayarları',
              'Kendi yapay zekâ sağlayıcınızı tanımladıysanız sağlayıcı adı, model ve API anahtarınız. API anahtarı veritabanında şifrelenerek saklanır, arayüzde tekrar gösterilmez',
              'İsteğe bağlı',
            ],
          ]}
        />
      </Bolum>

      <Bolum baslik="3. İşleme amaçları ve hukuki sebepleri">
        <P>
          Verileriniz, KVKK m.5’te sayılan aşağıdaki hukuki sebeplere dayanılarak işlenir:
        </P>
        <Liste>
          <li>
            <strong className="font-medium text-foreground">
              Sözleşmenin kurulması ve ifası (m.5/2-c):
            </strong>{' '}
            hesabınızın oluşturulması, kimlik doğrulama, panolarınızın ve projelerinizin
            saklanması, ekip arkadaşlarınızla paylaşım, bildirim gönderimi.
          </li>
          <li>
            <strong className="font-medium text-foreground">Meşru menfaat (m.5/2-f):</strong>{' '}
            kötüye kullanımın ve kaba kuvvet saldırılarının engellenmesi için istek sınırlama,
            hataların tespiti ve giderilmesi için hata kaydı tutulması, hizmetin sürekliliği.
          </li>
          <li>
            <strong className="font-medium text-foreground">Açık rıza (m.5/1):</strong> yapay zekâ
            özelliklerinin kullanılması ve bu kapsamda verilerin yurt dışındaki sağlayıcıya
            aktarılması, günlük özet e-postalarının gönderilmesi.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              Hakkın tesisi ve korunması (m.5/2-e):
            </strong>{' '}
            uyuşmazlık halinde delil olarak kullanılabilecek işlem kayıtlarının saklanması.
          </li>
        </Liste>
      </Bolum>

      <Bolum baslik="4. Toplama yöntemi">
        <P>
          Veriler, uygulamayı kullanırken doğrudan sizin tarafınızdan (kayıt formu, profil ekranı,
          pano üzerindeki işlemler) elektronik ortamda sağlanır. Google ile giriş yapmayı
          seçerseniz ad ve e-posta bilginiz kimlik sağlayıcıdan alınır. GitHub senkronunu
          açarsanız, herkese açık GitHub profil bilgileriniz GitHub üzerinden alınır.
        </P>
      </Bolum>

      <Bolum baslik="5. Yurt dışına aktarım" id="aktarim">
        <P>
          Quantro, altyapısını yurt dışında yerleşik hizmet sağlayıcılar üzerinde çalıştırır. Bu
          nedenle kişisel verileriniz KVKK m.9 kapsamında yurt dışına aktarılmaktadır. Aktarım
          yapılan taraflar ve aktarılan veriler:
        </P>
        <Tablo
          basliklar={['Alıcı', 'Amaç', 'Aktarılan veriler']}
          satirlar={[
            [
              'Supabase',
              'Veritabanı ve dosya depolama',
              'Hesap, profil, pano içeriği, yüklenen dosyalar — yani uygulamadaki tüm veriler',
            ],
            ['Render', 'Uygulamanın barındırılması', 'İstek trafiği, IP adresi, sunucu kayıtları'],
            [
              'Sentry',
              'Hata izleme ve teşhis',
              'Hata mesajları, hatanın oluştuğu sayfa ve kullanıcı kimliği. Avrupa Birliği (Almanya) bölgesine gönderilir',
            ],
            [
              'Resend',
              'E-posta gönderimi',
              'E-posta adresiniz ve gönderilen iletinin içeriği (doğrulama, parola sıfırlama, günlük özet)',
            ],
            [
              'Yapay zekâ sağlayıcısı',
              'Yalnızca yapay zekâ özelliklerini kullandığınızda',
              'Gönderdiğiniz istem ve ilgili pano bağlamı (kart başlıkları, açıklamalar). Amerika Birleşik Devletleri’nde işlenir',
            ],
            [
              'GitHub',
              'Yalnızca GitHub senkronunu açtığınızda',
              'GitHub kullanıcı adınız ve herkese açık profil bilgileriniz',
            ],
          ]}
        />
        <P>
          Yapay zekâ özelliklerini hiç kullanmazsanız, verileriniz yapay zekâ sağlayıcısına
          aktarılmaz. Bu aktarıma verdiğiniz açık rızayı her zaman geri çekebilirsiniz; geri
          çekmeniz halinde yapay zekâ özellikleri hesabınız için çalışmaz, uygulamanın geri kalanı
          çalışmaya devam eder.
        </P>
      </Bolum>

      <Bolum baslik="6. Saklama süresi">
        <P>
          Hesap ve içerik verileriniz, hesabınız açık olduğu sürece saklanır. IP adresiniz istek
          sınırlama amacıyla yalnızca sunucu belleğinde ve en fazla 15 dakika tutulur; kalıcı
          olarak kaydedilmez. Hata kayıtları, hizmet sağlayıcının saklama politikası uyarınca
          sınırlı bir süre tutulur.
        </P>
        <P>
          Uygulamada şu anda kendi kendine hesap silme özelliği bulunmamaktadır. Silme talebinizi
          aşağıdaki başvuru adresine ilettiğinizde hesabınız ve ilişkili verileriniz elle
          silinir.
        </P>
      </Bolum>

      <Bolum baslik="7. Veri güvenliği">
        <Liste>
          <li>Parolalar bcrypt ile özetlenerek saklanır; düz metin parola hiçbir yerde tutulmaz.</li>
          <li>Tanımladığınız yapay zekâ API anahtarı veritabanında şifreli olarak saklanır.</li>
          <li>Tüm trafik HTTPS üzerinden şifreli olarak taşınır.</li>
          <li>
            Giriş, kayıt ve parola sıfırlama uçları kaba kuvvet saldırılarına karşı hem IP hem
            hesap bazlı istek sınırlamasıyla korunur; diğer uçlarda genel bir istek sınırı
            uygulanır.
          </li>
          <li>Yetkilendirme, organizasyon ve proje bazlı rol denetimiyle yapılır.</li>
        </Liste>
      </Bolum>

      <Bolum baslik="8. Haklarınız (KVKK m.11)" id="haklar">
        <P>Kişisel verilerinizle ilgili olarak şu haklara sahipsiniz:</P>
        <Liste>
          <li>Kişisel verinizin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>
            İşlenme amacını ve verilerin amacına uygun kullanılıp kullanılmadığını öğrenme,
          </li>
          <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme,</li>
          <li>
            Kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,
          </li>
          <li>
            Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere
            bildirilmesini isteme,
          </li>
          <li>
            Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç
            ortaya çıkmasına itiraz etme,
          </li>
          <li>
            Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep
            etme.
          </li>
        </Liste>
      </Bolum>

      <Bolum baslik="9. Başvuru">
        <P>
          Yukarıdaki haklarınıza ilişkin taleplerinizi{' '}
          <a
            href={`mailto:${VERI_SORUMLUSU.eposta}`}
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            {VERI_SORUMLUSU.eposta}
          </a>{' '}
          adresine iletebilirsiniz. Başvurunuz, talebin niteliğine göre en geç otuz gün içinde
          sonuçlandırılır. Kimliğinizi doğrulayamadığımız başvurular, veri güvenliği gereği
          işleme alınamaz.
        </P>
        <P>
          Çerezler ve tarayıcıda saklanan veriler hakkında ayrıntı için{' '}
          <Link
            href="/cerez-politikasi"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Çerez Politikası
          </Link>
          , hizmetin kullanım kuralları için{' '}
          <Link
            href="/kullanim-kosullari"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Kullanım Koşulları
          </Link>{' '}
          sayfasına bakabilirsiniz.
        </P>
      </Bolum>
    </LegalPage>
  );
}
