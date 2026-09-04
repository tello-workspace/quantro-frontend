import type { Metadata } from 'next';
import Link from 'next/link';

import LegalPage, { Bolum, P, Liste, Tablo } from '@/features/legal/components/LegalPage';
import { VERI_SORUMLUSU, SON_GUNCELLEME } from '@/features/legal/veri-sorumlusu';

export const metadata: Metadata = {
  title: 'Çerez Politikası — Quantro',
  description:
    'Quantro’nun kullandığı çerezler ve tarayıcıda saklanan veriler: ne için kullanıldıkları, ne kadar saklandıkları ve nasıl silinecekleri.',
};

export default function CerezPolitikasiPage() {
  return (
    <LegalPage
      title="Çerez Politikası"
      ozet="Quantro’nun tarayıcınızda hangi verileri sakladığını, bunları ne için kullandığını ve nasıl silebileceğinizi açıklar."
      sonGuncelleme={SON_GUNCELLEME}
    >
      <Bolum baslik="Kısa özet">
        <P>
          Quantro reklam, izleme veya analiz çerezi <strong className="font-medium text-foreground">kullanmıyor</strong>.
          Tarayıcınızda sakladığımız her şey ya oturumunuzun açık kalması ya da arayüz tercihlerinizin
          hatırlanması içindir. Üçüncü taraflara satılan veya reklam amacıyla paylaşılan hiçbir
          tarayıcı verisi yoktur.
        </P>
      </Bolum>

      <Bolum baslik="Kullanılan çerezler">
        <Tablo
          basliklar={['Ad', 'Tür', 'Amaç', 'Süre']}
          satirlar={[
            [
              'sidebar_state',
              'İşlevsel',
              'Kenar çubuğunun açık mı kapalı mı olduğunu hatırlar; sayfa yenilendiğinde arayüzün yerinden oynamaması için',
              'Yaklaşık 7 gün',
            ],
          ]}
        />
      </Bolum>

      <Bolum baslik="Tarayıcı depolamasında (localStorage) saklananlar">
        <P>
          Aşağıdakiler teknik olarak çerez değildir; tarayıcınızın yerel depolamasında tutulur ve
          sunucuya kendiliğinden gönderilmez.
        </P>
        <Tablo
          basliklar={['Anahtar', 'Amaç', 'Süre']}
          satirlar={[
            [
              'token',
              'Oturum jetonunuz. Her istekte kimliğinizi doğrulamak için kullanılır; bu olmadan giriş yapmış kalamazsınız',
              'Çıkış yapana kadar (jeton 7 gün geçerlidir)',
            ],
            [
              'theme',
              'Açık/koyu tema tercihiniz. Sayfa açılırken beyaz ekran parlaması olmasın diye ilk boyamadan önce okunur',
              'Siz değiştirene kadar',
            ],
            [
              'sb-…-auth-token',
              'Yalnızca Google ile giriş yaparsanız oluşur. Kimlik sağlayıcı oturumunu Supabase istemcisi bu anahtarda tutar',
              'Çıkış yapana kadar',
            ],
          ]}
        />
      </Bolum>

      <Bolum baslik="Neden çerez onay penceresi yok?">
        <P>
          Çerez onayı, kural olarak zorunlu olmayan çerezler (reklam, izleme, analiz) için
          gereklidir. Quantro’da bu türden hiçbir çerez bulunmuyor; saklanan tek çerez arayüzün
          çalışması için gereken işlevsel bir tercihtir. Bu nedenle bir onay penceresi göstermek
          yerine, ne sakladığımızı bu sayfada açıkça listelemeyi tercih ettik.
        </P>
        <P>
          İleride analiz veya reklam aracı eklenirse, bu sayfa güncellenecek ve zorunlu olmayan
          çerezler için önceden onayınız alınacaktır.
        </P>
      </Bolum>

      <Bolum baslik="Nasıl silinir?">
        <Liste>
          <li>
            <strong className="font-medium text-foreground">Çıkış yaparak:</strong> oturum jetonunuz
            tarayıcıdan silinir.
          </li>
          <li>
            <strong className="font-medium text-foreground">Tarayıcı ayarlarından:</strong> site
            verilerini temizlediğinizde yukarıdakilerin tamamı silinir. Bu durumda oturumunuz kapanır
            ve tema tercihiniz sıfırlanır; hesabınızdaki hiçbir veri etkilenmez.
          </li>
          <li>
            <strong className="font-medium text-foreground">Çerezleri engelleyerek:</strong> tarayıcınız
            çerezleri tamamen engellerse uygulama çalışmaya devam eder, yalnızca kenar çubuğu tercihi
            hatırlanmaz.
          </li>
        </Liste>
      </Bolum>

      <Bolum baslik="Sorularınız için">
        <P>
          Bu politikayla ilgili sorularınızı{' '}
          <a
            href={`mailto:${VERI_SORUMLUSU.eposta}`}
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            {VERI_SORUMLUSU.eposta}
          </a>{' '}
          adresine iletebilirsiniz. Kişisel verilerinizin işlenmesine ilişkin ayrıntılı bilgi için{' '}
          <Link
            href="/kvkk"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            KVKK Aydınlatma Metni
          </Link>{' '}
          sayfasına bakabilirsiniz.
        </P>
      </Bolum>
    </LegalPage>
  );
}
