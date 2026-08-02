import { cn } from '@/lib/utils';

// Quantro marka isareti: Q'nun ic boslugu yukselen barlara donusuyor -
// ilerleme + veri (quant) fikri. Olculer logo sisteminin ikon karesinden
// birebir alindi (76px halka, 4px kontur, 7px genisliginde 13/22/31 barlar,
// 6px bosluk, alttan 14px pay).
//
// Renk currentColor uzerinden gelir: cagiran taraf tema icin dogru varyanti
// secer (acik zeminde #796cbf, koyu zeminde #9184d9). Boylece isaret tek bir
// yerde tanimli kalir, her kullanim yerinde SVG kopyalanmaz.
export function QuantroMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 76 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('size-full', className)}
    >
      <circle cx="38" cy="38" r="36" stroke="currentColor" strokeWidth="4" />
      <rect x="21.5" y="49" width="7" height="13" fill="currentColor" />
      <rect x="34.5" y="40" width="7" height="22" fill="currentColor" />
      <rect x="47.5" y="31" width="7" height="31" fill="currentColor" />
    </svg>
  );
}

// Marka moru: acik temada koyu varyant, koyu temada acik varyant. Tema
// token'i (--primary) yerine sabit marka rengi kullaniliyor - logo temaya
// gore renk degistirmemeli, sadece zemine gore okunakli kalmali.
export const QUANTRO_MARK_COLOR = 'text-[#796cbf] dark:text-[#9184d9]';

// Ikon + wordmark kilidi (lockup). Header ve benzeri yerlerde kullanilir.
export function QuantroLogo({
  className,
  showWordmark = true,
  markClassName,
}: {
  className?: string;
  showWordmark?: boolean;
  markClassName?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background p-1.5',
          QUANTRO_MARK_COLOR,
          markClassName,
        )}
      >
        <QuantroMark />
      </span>
      {showWordmark && (
        <span className="text-sm font-medium tracking-[-0.02em] text-foreground">Quantro</span>
      )}
    </span>
  );
}

// Q'nun yerine isaretin gectigi saf wordmark. Buyuk puntolarda (giris/kayit
// sayfasi gibi) kullanilir - isaret harf yuksekligine gore olceklenir.
export function QuantroWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium tracking-[-0.02em] text-foreground',
        className,
      )}
    >
      <span className={cn('mr-[0.1em] inline-block size-[0.78em]', QUANTRO_MARK_COLOR)}>
        <QuantroMark />
      </span>
      uantro
    </span>
  );
}
