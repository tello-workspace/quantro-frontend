import Link from 'next/link';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowRight, Plug, ShieldCheck, Wrench } from 'lucide-react';

import { QuantroMark } from '@/components/ui/quantro-logo';
import AnnouncementBar from './AnnouncementBar';
import HeroKeycap from './HeroKeycap';
import LandingFooter from './LandingFooter';

// Pazarlama yuzeyine ozgu teknik yazi tipi. next/font "kullanildigi bilesene
// kapsanir" diyor - yani bu dosya yalnizca / rotasinda render edildigi icin
// uygulama icindeki sayfalar bu fontun indirme maliyetini odemiyor.
//
// Degisken adi bilerek --font-landing-mono: globals.css'teki tema
// --font-mono'su tanimsiz bir --font-geist-mono'ya isaret ediyor (yani
// Tailwind'in font-mono yardimcisi bu projede calismiyor). Kendi adimizi
// kullanip o cozulmemis zincire hic girmiyoruz.
const landingMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-landing-mono',
  weight: ['400', '500'],
});

const MONO = 'font-[family-name:var(--font-landing-mono)]';

// Zemindeki blueprint bloklari. Koordinatlar 72'nin katlari ve SVG
// userSpaceOnUse ile CSS pikseline 1:1 esleniyor - bu yuzden bloklar arkadaki
// izgara desenine TAM oturuyor, yuzde tabanli yerlesimdeki kayma olmuyor.
// Genislik araligi ~1850px'e kadar: dar ekranda saga dusenler kirpiliyor.
const BLOKLAR = [
  { x: 144, y: 72, w: 216, h: 144 },
  { x: 216, y: 288, w: 72, h: 72 },
  { x: 432, y: 144, w: 144, h: 72 },
  { x: 72, y: 432, w: 144, h: 216 },
  { x: 288, y: 576, w: 216, h: 144 },
  { x: 648, y: 72, w: 288, h: 144 },
  { x: 1008, y: 144, w: 144, h: 144 },
  { x: 1080, y: 432, w: 72, h: 72 },
  { x: 1224, y: 72, w: 216, h: 216 },
  { x: 1512, y: 216, w: 144, h: 144 },
  { x: 1656, y: 432, w: 216, h: 144 },
  { x: 1368, y: 576, w: 144, h: 216 },
  { x: 936, y: 648, w: 288, h: 144 },
  { x: 504, y: 720, w: 144, h: 144 },
];

const KANITLAR = [
  { Icon: Plug, label: 'MCP sunucusu' },
  { Icon: Wrench, label: '14 araç' },
  { Icon: ShieldCheck, label: 'Çakışma koruması' },
];

export default function LandingHero() {
  return (
    // Hero bilerek TEMADAN BAGIMSIZ koyu: renkler tema token'lari yerine sabit.
    // Pazarlama yuzeyi acik temada da bu haliyle gorunmeli, yoksa referanstaki
    // yuksek kontrastli karakter kayboluyor. Uygulama ici (/projects ve
    // otesi) tema token'lariyla calismaya devam ediyor.
    // min-h-svh + flex sutunu: hero icerigi viewport'tan kisa kaldiginda
    // altinda body'nin TEMA zemini goruluyordu (acik temada beyaz bir serit).
    // Kabuk artik ekrani her zaman dolduruyor, govde de flex-1 ile bosluğu
    // yiyor. svh (dvh degil) secildi: mobil tarayicida adres cubugu
    // gizlenip acilirken yukseklik zipladigi icin dvh burada titreme yapar.
    <div
      className={`${landingMono.variable} relative isolate flex min-h-svh flex-col overflow-hidden bg-[#08090C] text-white`}
    >
      <AnnouncementBar />

      {/* ---------- Zemin: izgara + bloklar + vinyet ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="quantro-hero-grid" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M72 0H0V72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#quantro-hero-grid)" />
          {BLOKLAR.map((b) => (
            <rect
              key={`${b.x}-${b.y}`}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="none"
              stroke="rgba(255,255,255,0.11)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Merkezi karartan vinyet: izgara kenarlarda yasiyor, yazinin
            arkasinda sonuyor. Basligin kontrasti bununla garantileniyor.
            Elips genis ve gec kapaniyor (%92) - daha erken kapatinca izgara
            neredeyse tamamen yutuluyor ve zemin duz siyaha donuyordu. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_50%_44%,transparent_0%,rgba(8,9,12,0.86)_58%,#08090C_92%)]" />
        {/* Mor sicaklik - marka renginin cok soluk bir yansimasi. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_32%_at_50%_38%,rgba(145,132,217,0.13),transparent_70%)]" />
      </div>

      {/* ---------- Ust menu ---------- */}
      {/* Menu bilerek KENARDAN KENARA (max-w yok): referansta da oyle ve
          ortalanmis dar bir menu genis ekranda hero'yu kucultuyordu. */}
      <header className="relative z-10 flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="Quantro ana sayfa"
          className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9184d9]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 p-1.5 text-[#9184d9]">
            <QuantroMark />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Quantro</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-white/75 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
          >
            Giriş yap
          </Link>
          <Link
            href="/register"
            className="flex h-11 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[#08090C] transition-colors duration-200 hover:bg-white/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
          >
            Ücretsiz başla
          </Link>
        </nav>
      </header>

      {/* ---------- Hero govdesi ---------- */}
      {/* Dikey bosluk bilerek dar: flex-1 + justify-center zaten ortaliyor,
          buyuk padding ustune footer gelince sayfa viewport'u ~150px asip
          hukuki linkleri katlamanin altinda birakiyordu. */}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-8 sm:py-12">
        {/* Kanit seridi: referansta yildizli puanlar vardi. Quantro'nun
            dogrulanabilir bir puani olmadigi icin yerine olcülebilir
            yetenekler konuldu - uydurma sosyal kanit yok. */}
        <ul
          className={`${MONO} flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] tracking-[0.16em] text-white/55 uppercase sm:gap-x-7 sm:text-xs`}
        >
          {KANITLAR.map(({ Icon, label }, i) => (
            <li key={label} className="flex items-center gap-2.5 sm:gap-7">
              {i > 0 && <span aria-hidden className="hidden h-3 w-px bg-white/15 sm:block" />}
              <span className="flex items-center gap-2">
                <Icon aria-hidden className="size-3.5 text-[#9184d9]" />
                {label}
              </span>
            </li>
          ))}
        </ul>

        <h1 className="mt-8 text-[clamp(2.5rem,8.6vw,7rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance sm:mt-10">
          <span className="block">Panonla konuş,</span>
          {/* Tus satirin AKISINA giriyor: yuksekligi satir yuksekligini
              astigi icin yazinin uzerine tasiyor ve golgesini uzerine
              dusuruyor - referanstaki "cisim yazinin onunde" etkisi.
              flex-wrap sayesinde dar ekranda alt satira temiz iniyor. */}
          <span className="flex flex-wrap items-center justify-center gap-x-[0.06em]">
            çakışmadan
            <HeroKeycap className="mx-[0.03em] size-[clamp(3.25rem,9.4vw,7.5rem)]" />
            çalış
          </span>
        </h1>

        <p className="mt-7 max-w-[46ch] text-[clamp(1rem,1.55vw,1.2rem)] leading-relaxed text-pretty text-white/65 sm:mt-8">
          Quantro, MCP üzerinden Claude&apos;a açılan bir proje panosu. Toplantı notunu göreve
          çevirir, kartı senin adına üstlenir — ve aynı kartta başkası çalışıyorsa, sen koda
          başlamadan önce söyler.
        </p>

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3.5">
          <Link
            href="/register"
            className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#08090C] transition-colors duration-200 hover:bg-white/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
          >
            Ücretsiz başla
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl border border-white/18 bg-white/[0.06] px-6 text-[15px] font-semibold text-white transition-colors duration-200 hover:border-white/30 hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
          >
            Giriş yap
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
