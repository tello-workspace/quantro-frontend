import LandingHero from '@/features/landing/components/LandingHero';

// Ana sayfa artik /projects'e yonlendirmiyor, tanitim sayfasi.
//
// Yonlendirmeyi kaldirmak guvenli: AuthenticatedShell'de '/' zaten
// PUBLIC_ROUTES icinde ve public rotalarda shell `children`i sidebar/header
// SARMADAN donuyor. Yani bu sayfa uygulama kabugunun disinda, tam ekran
// render oluyor - uygulama ici duzenine hic dokunulmadi.
//
// NOT: Oturumu ACIK kullanici da artik bu sayfayi goruyor - eskiden '/'
// dogrudan /projects'e atiyordu. /login oturumu acik olani kendiliginden
// yonlendirmiyor (LoginForm yalnizca basarili GONDERIMDEN sonra /projects'e
// gidiyor), yani giris yapmis biri '/' adresine gelirse panoya donmek icin
// /projects'e kendisi gitmeli. Istenirse burada token kontrollu bir
// yonlendirme ya da menude kosullu bir "Panoya don" baglantisi eklenebilir.
export default function Home() {
  return <LandingHero />;
}
