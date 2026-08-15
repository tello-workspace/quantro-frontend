'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

// globals.css'te koyu tema ".dark" sinifina bagli oldugu icin temayi
// <html> uzerindeki sinifi degistirerek yonetiyoruz. Ilk boyamada yanlis
// tema gorunmesin diye secim layout'taki kucuk script ile okunuyor.
//
// <html> sinifi React'in disinda bir kaynak: useSyncExternalStore ile
// okunuyor. Onceki hali effect icinde setState cagirip mount'tan sonra
// fazladan bir render turu uretiyordu (react-hooks/set-state-in-effect).
// Sunucu anlik goruntusu ayrica "henuz bilmiyoruz" durumunu da tasiyor -
// hidrasyon uyusmazligini onleyen "mounted" bayragi boylece gereksiz kaldi.
function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

// Sunucuda <html> yok; null "henuz belli degil" demek ve ikon gizli kalir.
function getServerSnapshot(): boolean | null {
  return null;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    // setState yok: sinif degisimini MutationObserver yakalayip yeniden
    // cizdiriyor, yani tek bir dogruluk kaynagi kaliyor (<html> sinifi).
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={isDark ? 'Açık tema' : 'Koyu tema'}
      className="cursor-pointer"
    >
      {/* isDark null iken (sunucu / ilk boyama) iki ikon da gizli */}
      {isDark !== null && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
    </Button>
  );
}
