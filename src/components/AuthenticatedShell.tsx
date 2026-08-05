'use client';

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, PlugZap } from "lucide-react";
import Header from "@/components/Header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useGetMeQuery } from "@/features/auth/meApi";
import { useTranslation } from "@/hooks/useTranslation";
import { disconnectSocket } from "@/lib/socket";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
];

function isPublicRoute(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Token localStorage'da, yani React'in disinda yasiyor. useSyncExternalStore
// dogru arac: hem hydration uyumsuzlugunu (sunucuda token yok) React'in kendisi
// hallediyor, hem de "auth:changed" ve "storage" olaylarina abone oldugumuz
// icin BASKA BIR SEKMEDE yapilan cikis bu sekmeye de aninda yansiyor.
function tokenaAboneOl(bildir: () => void) {
  window.addEventListener('auth:changed', bildir);
  window.addEventListener('storage', bildir);
  return () => {
    window.removeEventListener('auth:changed', bildir);
    window.removeEventListener('storage', bildir);
  };
}

const tokenOku = () => localStorage.getItem('token');
const sunucudaTokenYok = () => null;

// DIKKAT: useTranslation() iceride useGetMeQuery() cagiriyor. Bu yuzden bu iki
// ekran ayri bilesen: shell'in govdesinde cagrilsalardi /auth/me GIRIS ONCESI
// sayfalarda da tetiklenirdi ve 401 -> /login yonlendirmesi sifre sifirlama,
// e-posta dogrulama ve OAuth callback akislarini kirardi. Buradaki iki bilesen
// yalnizca token varken render ediliyor, o yuzden guvenli - ustelik ayni cache
// girdisine abone olduklari icin ek istek de acmiyorlar.
function Yukleniyor() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}

function OturumAcilamadi({ tekrarDene }: { tekrarDene: () => void }) {
  const { t } = useTranslation();

  const cikisYap = async () => {
    localStorage.removeItem('token');
    disconnectSocket();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Cikisi engellemesin - token zaten silindi.
      }
    }
    window.dispatchEvent(new Event('auth:changed'));
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <PlugZap aria-hidden className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t('sessionUnavailableTitle')}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{t('sessionUnavailableDesc')}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={tekrarDene}>{t('retry')}</Button>
        <Button variant="outline" onClick={cikisYap}>{t('logout')}</Button>
      </div>
    </div>
  );
}

// Tek root shell: sidebar state route degisimlerinde korunur.
export default function AuthenticatedShell({
  children,
  defaultSidebarOpen = false,
}: {
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);
  const token = useSyncExternalStore(tokenaAboneOl, tokenOku, sunucudaTokenYok);

  useEffect(() => {
    if (!publicRoute && !token) {
      router.replace('/login');
    }
  }, [publicRoute, token, router]);

  // Oturumu ACMADAN once dogruluyoruz. Eskiden shell yalnizca localStorage'da
  // bir token DIZESI bulunmasina bakip tum arayuzu aciyordu; tokenin gecerli
  // olup olmadigi hic sorulmuyordu. Sonuc: /auth/me 401 DISINDA bir sebeple
  // basarisiz oldugunda (DB havuzu dolunca donen 503, sunucu soguk baslangici,
  // kopuk ag) kullanici "giris yapmis" ama kimliksiz bir arayuzde kaliyordu -
  // isim yok, organizasyon yok, butonlar disabled ve hicbir hata mesaji yok.
  // Sayfa yenilemek ayni tokeni tekrar denedigi icin durumu degistirmiyordu;
  // tek cikis yolu elle cikis yapmakti.
  const { data: me, isLoading, isError, error, refetch } = useGetMeQuery(undefined, {
    skip: publicRoute || !token,
  });

  if (publicRoute) {
    return children;
  }

  if (!token) {
    // Ya hydration sirasindayiz (sunucu anlik goruntusu her zaman null) ya da
    // token yok ve yukaridaki effect /login'e goturuyor. Iki durumda da
    // gosterilecek bir sey yok.
    return null;
  }

  if (isLoading) {
    return <Yukleniyor />;
  }

  // Hata ekrani YALNIZCA elimizde hic kullanici yokken cikiyor. Oturum bir kez
  // acildiktan sonra gelen gecici bir /auth/me hatasi calisan arayuzu yikmamali;
  // o durumda eldeki veriyle devam edip sessizce yeniden denemek dogru davranis.
  if (isError && !me) {
    // 401 ise baseQueryWithLogout zaten tokeni silip /login'e goturuyor;
    // burada bos ekran yeterli. Digerleri GECICI hatalar - kullaniciya ne
    // oldugunu soyleyip tekrar deneme imkani veriyoruz.
    const durum = error && 'status' in error ? error.status : undefined;
    if (durum === 401) return null;

    return <OturumAcilamadi tekrarDene={() => refetch()} />;
  }

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
