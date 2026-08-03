'use client';

import React from 'react';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import { QuantroMark } from '@/components/ui/quantro-logo';

interface Props {
  children: React.ReactNode;
  /** Sol markalı panelde başlığın altında görünen cümle */
  tagline: string;
}

// Giris/kayit sayfalarinin ortak kabugu: solda marka paneli, sagda form.
//
// Sol panel BILEREK her zaman koyu - marka yuzeyi olarak davraniyor ve
// kullanicinin tema tercihinden bagimsiz ayni kaliyor. Bunu `dark` sinifiyla
// yapiyoruz (tema sinif tabanli: globals.css'te @custom-variant dark),
// boylece panel icindeki her sey - TextHoverEffect dahil, ki o --primary /
// --chart-2 token'larini kullaniyor - koyu tema degerlerine cozunuyor.
// Token'lari elle ezmeye calismak TextHoverEffect'i acik temada okunmaz
// hale getirirdi.
//
// Sag panel ise temaya uyuyor: form kullanicinin gunluk calisma ortami,
// oraya bir tema dayatmak dogru degil.
export const AuthShell: React.FC<Props> = ({ children, tagline }) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sol: marka paneli - lg altinda gizli, yerine formun ustunde
          kompakt bir marka basligi gosteriliyor */}
      <div className="dark relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16 xl:px-20">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg,#1a1b2b 0%,#0e0f18 45%,#191728 100%)' }}
        />

        {/* Marka morunda iki yumusak isik lekesi - duz gradyanin
            uzerine derinlik katiyor */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 600px 500px at 18% 12%,rgba(145,132,217,0.18),transparent 60%),' +
              'radial-gradient(ellipse 700px 600px at 82% 88%,rgba(210,206,253,0.10),transparent 60%)',
          }}
        />

        {/* Ince diagonal doku: yuzeyin duz bir renk yerine dokunmus
            hissetmesini sagliyor, %4 opaklikta zar zor secilir */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(112deg,transparent 0px,transparent 38px,rgba(255,255,255,0.6) 38px,rgba(255,255,255,0.6) 39px)',
          }}
        />

        <div className="relative z-10 flex flex-col gap-6">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-white/12 bg-white/6 p-3 text-[#b3a8ef] backdrop-blur-sm">
            <QuantroMark />
          </span>

          {/* Mevcut hover efekti korundu - marka panelinin odak noktasi */}
          <div className="-ml-2 h-32 w-full max-w-lg xl:h-40">
            <TextHoverEffect text="Quantro" />
          </div>

          <p className="max-w-sm text-[0.9375rem] leading-relaxed text-white/55">{tagline}</p>
        </div>
      </div>

      {/* Sag: form paneli - temaya uyar */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Kucuk ekranda sol panel yok; marka yine de gorunmeli */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card p-2 text-[#796cbf] dark:text-[#9184d9]">
              <QuantroMark />
            </span>
            <span className="text-lg font-medium tracking-[-0.02em] text-foreground">Quantro</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
