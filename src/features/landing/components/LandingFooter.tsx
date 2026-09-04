import Link from 'next/link';

import { LEGAL_LINKS } from '@/features/legal/components/LegalPage';

// Landing'in alt seridi: desteklenen istemciler + hukuki baglantilar.
//
// Ayri bir footer blogu olarak degil, mevcut serit GENISLETILEREK yapildi:
// hero tam olarak viewport yuksekliginde oturuyor, alta bagimsiz bir blok
// eklemek sayfayi ~100px tasirip rahatsiz edici kisa bir kaydirma
// yaratiyordu. Iki satir ayni seritte durunca yukseklik butcesi korunuyor.
//
// Yazi tipi degiskeni (--font-landing-mono) ust bilesenden miras aliniyor,
// burada tekrar yuklenmiyor.

// MCP sunucusunun README'sinde yazan gercek desteklenen istemciler.
// Musteri logosu uydurulmadi.
const ISTEMCILER = ['Claude Desktop', 'Claude Code', 'MCP destekleyen her istemci'];

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center gap-3.5">
          <p className="font-[family-name:var(--font-landing-mono)] text-[10.5px] tracking-[0.2em] text-white/40 uppercase">
            Şunlarla çalışır
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:gap-x-10">
            {ISTEMCILER.map((istemci) => (
              <li key={istemci} className="text-sm font-medium text-white/55 sm:text-[15px]">
                {istemci}
              </li>
            ))}
          </ul>
        </div>

        <div className="h-px w-full max-w-xs bg-white/10" aria-hidden />

        <div className="flex flex-col items-center gap-x-6 gap-y-2 sm:flex-row">
          <p className="text-xs text-white/35">Quantro — öğrenci projesi</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center rounded-sm text-xs text-white/45 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
