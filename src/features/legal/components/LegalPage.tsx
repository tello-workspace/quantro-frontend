import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { QuantroMark, QUANTRO_MARK_COLOR } from '@/components/ui/quantro-logo';
import { cn } from '@/lib/utils';

// Hukuki sayfalarin ortak kabugu.
//
// Landing hero'nun aksine bu sayfalar TEMAYA UYUYOR (sabit koyu degil):
// burada uzun metin okunuyor, kullanicinin kendi tema tercihini zorla
// degistirmek okunabilirligi dusururdu. Hero pazarlama yuzeyi, bu ise
// referans metni - farkli isler, farkli kararlar.

export const LEGAL_LINKS = [
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
] as const;

export default function LegalPage({
  title,
  ozet,
  sonGuncelleme,
  children,
}: {
  title: string;
  ozet: string;
  sonGuncelleme: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card p-1.5',
                QUANTRO_MARK_COLOR,
              )}
            >
              <QuantroMark />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Quantro</span>
          </Link>

          <Link
            href="/"
            className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          Son güncelleme: {sonGuncelleme}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">{ozet}</p>

        {/* Taslak uyarisi bilerek metnin BASINDA ve gorunur: bu dosyalar
            gercek veri akisina bakilarak yazildi ama hukuki inceleme
            gormedi. Dipnota gomulseydi okunmazdi. */}
        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-foreground">
          <strong className="font-semibold">Taslak metin.</strong> Quantro bir öğrenci/portföy
          projesidir ve ticari bir hizmet olarak sunulmamaktadır. Bu metin uygulamanın gerçek veri
          akışına göre hazırlanmıştır, ancak hukuki inceleme görmemiştir. Gerçek bir yayına almadan
          önce bir hukukçuya danışılmalıdır.
        </div>

        <div className="mt-10 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-muted-foreground">Quantro — proje panosu</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

// --- Metin yapi taslari -----------------------------------------------------
// Uc hukuki sayfanin da ayni tipografiyi kullanmasi icin tek yerde tanimli.
// Projede @tailwindcss/typography kurulu degil, bu yuzden `prose` yerine
// acik siniflar.

export function Bolum({
  baslik,
  id,
  children,
}: {
  baslik: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{baslik}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">{children}</p>;
}

export function Liste({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
      {children}
    </ul>
  );
}

// Islenen veri / aktarilan taraf gibi tablolar dar ekranda tasmasin diye
// kendi yatay kaydirma kutusunda. Sayfa govdesi asla yatay kaymaz.
export function Tablo({ basliklar, satirlar }: { basliklar: string[]; satirlar: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {basliklar.map((b) => (
              <th key={b} scope="col" className="px-4 py-3 font-semibold text-foreground">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {satir.map((h, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-4 py-3 align-top leading-relaxed',
                    j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {h}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
