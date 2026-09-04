import type { Metadata } from 'next';
import Link from 'next/link';

import LegalPage, { Bolum, P, Liste } from '@/features/legal/components/LegalPage';
import { VERI_SORUMLUSU, SON_GUNCELLEME } from '@/features/legal/veri-sorumlusu';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları — Quantro',
  description:
    'Quantro’yu kullanırken geçerli kurallar: hizmetin niteliği, hesap sorumluluğu, içerik hakları, yapay zekâ özelliklerinin sınırları ve sorumluluk reddi.',
};

export default function KullanimKosullariPage() {
  return (
    <LegalPage
      title="Kullanım Koşulları"
      ozet="Quantro’yu kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Metin kısa tutuldu; okunmadan kabul edilen bir sözleşme kimsenin işine yaramıyor."
      sonGuncelleme={SON_GUNCELLEME}
    >
      <Bolum baslik="1. Hizmetin niteliği">
        <P>
          Quantro bir öğrenci/portföy projesidir. Ticari bir ürün olarak sunulmamaktadır, ücret
          alınmamaktadır ve arkasında bir şirket, destek ekibi veya hizmet seviyesi taahhüdü
          yoktur.
        </P>
        <P>
          Bu, aşağıdakiler anlamına gelir ve bunları açıkça bilmenizi isteriz:
        </P>
        <Liste>
          <li>Hizmet önceden haber verilmeksizin kesintiye uğrayabilir veya tamamen kapatılabilir.</li>
          <li>Veri kaybı ihtimali gerçektir; düzenli yedek alma garantisi verilmemektedir.</li>
          <li>
            <strong className="font-medium text-foreground">
              Kaybını göze alamayacağınız veriyi Quantro’da tutmayın.
            </strong>{' '}
            Kritik iş verisi, kişisel sağlık/finans bilgisi veya gizlilik sözleşmesine tabi
            içerikler için uygun değildir.
          </li>
        </Liste>
      </Bolum>

      <Bolum baslik="2. Hesabınız">
        <Liste>
          <li>Kayıt olurken doğru bilgi vermeniz beklenir.</li>
          <li>
            Parolanızın gizliliğinden siz sorumlusunuz. Hesabınızla yapılan işlemler size ait kabul
            edilir.
          </li>
          <li>
            Oluşturduğunuz API jetonları hesabınız adına çalışır. Jetonu paylaşırsanız, paylaştığınız
            kişi sizin görebildiğiniz her şeyi görebilir. Sızdığını düşünüyorsanız profil ekranından
            iptal edin.
          </li>
          <li>Hesabınızı başkasına devredemez veya birden çok kişiyle paylaşamazsınız.</li>
        </Liste>
      </Bolum>

      <Bolum baslik="3. Kabul edilmeyen kullanım">
        <Liste>
          <li>Hukuka aykırı, başkalarının haklarını ihlal eden veya zarar veren içerik yüklemek.</li>
          <li>Sistemin güvenliğini test etmeye, aşmaya veya hizmeti kullanılamaz hâle getirmeye çalışmak.</li>
          <li>
            İstek sınırlarını otomatik araçlarla aşmaya çalışmak veya altyapıya orantısız yük
            bindirmek.
          </li>
          <li>Başkalarının hesaplarına veya organizasyon verilerine yetkisiz erişmeye çalışmak.</li>
          <li>Zararlı yazılım içeren dosya yüklemek.</li>
        </Liste>
        <P>
          Bu kuralları ihlal eden hesaplar uyarı yapılmaksızın kapatılabilir.
        </P>
      </Bolum>

      <Bolum baslik="4. İçerikleriniz">
        <P>
          Quantro’ya yüklediğiniz içerikler (kartlar, yorumlar, belgeler, dosyalar) size aittir.
          Bunlar üzerinde herhangi bir mülkiyet hakkı talep edilmez. İçeriğiniz yalnızca hizmetin
          çalıştırılması amacıyla saklanır ve işlenir; üçüncü taraflara pazarlama amacıyla
          aktarılmaz veya satılmaz.
        </P>
        <P>
          Bir organizasyona veya projeye içerik eklediğinizde, o organizasyonun/projenin diğer
          yetkili üyeleri bu içeriği görebilir. Paylaşım kapsamını eklemeden önce
          değerlendirmeniz beklenir.
        </P>
      </Bolum>

      <Bolum baslik="5. Yapay zekâ özellikleri">
        <P>
          Quantro’nun yapay zekâ özellikleri, verdiğiniz istem ve ilgili pano bağlamını yurt
          dışındaki bir dil modeli sağlayıcısına gönderir. Bu özellikleri kullanmak isteğe
          bağlıdır.
        </P>
        <Liste>
          <li>
            Üretilen çıktılar hatalı, eksik veya yanıltıcı olabilir. Kararlarınızı yalnızca bu
            çıktılara dayandırmayın.
          </li>
          <li>
            Panoya yazdığınız her şey, yapay zekâ özelliğini kullandığınızda sağlayıcıya gitme
            ihtimali taşır. Gizli bilgileri panoya yazmayın.
          </li>
          <li>
            Kendi API anahtarınızı tanımlarsanız, ilgili sağlayıcının ücretlendirmesi ve kullanım
            koşulları sizinle o sağlayıcı arasındadır.
          </li>
        </Liste>
      </Bolum>

      <Bolum baslik="6. Sorumluluk reddi">
        <P>
          Hizmet “olduğu gibi” sunulmaktadır. Kesintisiz veya hatasız çalışacağı, verilerin
          kaybolmayacağı ya da belirli bir amaca uygun olacağı yönünde açık veya zımni hiçbir
          garanti verilmemektedir. Yürürlükteki hukukun izin verdiği azami ölçüde, hizmetin
          kullanımından doğan doğrudan veya dolaylı zararlardan sorumluluk kabul edilmemektedir.
        </P>
      </Bolum>

      <Bolum baslik="7. Hesabın kapatılması">
        <P>
          Hesabınızın silinmesini istediğinizde{' '}
          <a
            href={`mailto:${VERI_SORUMLUSU.eposta}`}
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            {VERI_SORUMLUSU.eposta}
          </a>{' '}
          adresine yazmanız yeterlidir; hesabınız ve ilişkili verileriniz silinir. Uygulama içinden
          kendi kendine silme özelliği şu anda bulunmamaktadır.
        </P>
      </Bolum>

      <Bolum baslik="8. Değişiklikler">
        <P>
          Bu koşullar zaman zaman güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır ve
          yukarıdaki “son güncelleme” tarihi değiştirilir. Önemli bir değişiklik olduğunda
          uygulama içinden bilgilendirilirsiniz.
        </P>
        <P>
          Kişisel verilerinizin nasıl işlendiğini{' '}
          <Link
            href="/kvkk"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            KVKK Aydınlatma Metni
          </Link>{' '}
          sayfasında, tarayıcınızda saklananları{' '}
          <Link
            href="/cerez-politikasi"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Çerez Politikası
          </Link>{' '}
          sayfasında bulabilirsiniz.
        </P>
      </Bolum>
    </LegalPage>
  );
}
