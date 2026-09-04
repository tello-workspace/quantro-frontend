'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';

// Hero'nun ustundeki ince duyuru seridi. Landing'deki TEK client bilesen -
// kapatma durumu icin state gerekiyor. Geri kalan her sey server component
// oldugu icin sayfa neredeyse sifir JS ile geliyor.
//
// Kapatma bilgisi bilerek kalici degil (localStorage yok): pazarlama seridi
// oturum boyunca kapali kalsin yeter, kalicilastirmak cerez/izin tarafinda
// gereksiz bir yuk acardi.
export default function AnnouncementBar() {
  const [gorunur, setGorunur] = useState(true);

  if (!gorunur) return null;

  return (
    <div className="relative z-20 border-b border-white/10 bg-[#0B0C10]">
      {/* Yukseklik BAGLANTININ kendisinden geliyor (min-h-11), sarmalayicidan
          degil: onceden serit py-2.5 ile yuksekti ama tiklanabilir alan
          yalnizca 17px'lik metin kutusuydu - dokunma hedefi olcumunde bu
          cikti. Simdi serit yuksekligi = tiklanabilir yukseklik = 44px. */}
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-12 sm:px-14">
        <Link
          href="/register"
          className="group flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-sm py-2 text-center font-[family-name:var(--font-landing-mono)] text-[11px] tracking-[0.14em] text-white/70 uppercase transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9184d9]"
        >
          <span className="font-semibold text-white">Tıklama. Söyle.</span>
          <span aria-hidden className="hidden h-3 w-px bg-white/20 sm:block" />
          <span className="inline-flex items-center gap-1.5">
            Quantro MCP sunucusu yayında
            <ArrowRight
              aria-hidden
              className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setGorunur(false)}
        aria-label="Duyuruyu kapat"
        className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-white/50 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9184d9]"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
