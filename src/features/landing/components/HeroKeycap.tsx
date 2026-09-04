import { QuantroMark } from '@/components/ui/quantro-logo';
import { cn } from '@/lib/utils';

// Basligin icine giren 3B tus. Referans tasarimda buraya bir gorsel
// konuyordu; biz onun yerine markanin kendi isaretini kabartilmis bir tus
// yuzeyine basiyoruz - ek bir gorsel varligi (indirme maliyeti, retina
// varyanti, alt metni) tasimadan ayni "cisim yazinin uzerinde duruyor"
// etkisini veriyor.
//
// Derinlik tamamen iki katmandan geliyor: disdaki govde (etek) ve icteki
// egimli ust yuzey. Ust yuzeydeki ic golgeler kenarlari yuvaya oturtuyor,
// distaki drop-shadow ise tusu yazinin ONUNE cikariyor.
//
// Tamamen dekoratif: metinde bir anlam tasimiyor, o yuzden aria-hidden.
// Basligin okunusu ("Panonla konus, cakismadan calis") tus olmadan da tam.
export default function HeroKeycap({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none relative inline-block shrink-0 align-middle',
        'animate-hero-float will-change-transform',
        'drop-shadow-[0_24px_34px_rgba(0,0,0,0.7)]',
        className,
      )}
    >
      {/* Govde (etek): tusun yan yuzeyi. Ust kenardaki ic beyaz cizgi
          pahi, alttaki koyu ic golge ise tabana oturmayi taklit ediyor. */}
      <span className="block size-full rounded-[24%] bg-[linear-gradient(180deg,#7d6fd4_0%,#5b4da8_100%)] p-[9%] shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-6px_10px_rgba(28,20,64,0.55),0_0_70px_rgba(145,132,217,0.32)]">
        {/* Ust yuzey: hafif egik gradyan + tepede parlama, dipte kuyu golgesi. */}
        <span className="flex size-full items-center justify-center rounded-[19%] bg-[linear-gradient(165deg,#b3a7f7_0%,#8b7ee6_52%,#7568d2_100%)] shadow-[inset_0_2px_1px_rgba(255,255,255,0.55),inset_0_-4px_8px_rgba(45,33,102,0.5)]">
          <QuantroMark className="w-[52%] text-white" />
        </span>
      </span>
    </span>
  );
}
