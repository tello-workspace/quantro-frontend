import type { Metadata } from 'next'
import StoreProvider from '@/lib/StoreProvider'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './globals.css'
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

// Plus Jakarta Sans: SaaS/pano arayuzleri icin onerilen, Geist'e gore
// daha karakterli ve basliklarda daha iyi duran bir govde yazi tipi.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

// Tema secimi ilk boyamadan once uygulanmali, yoksa koyu temada bir kare
// beyaz ekran (FOUC) goruluyor.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: 'Tello',
  description: 'Sana konuşan proje panosu — stale kartları, iş yükünü ve darboğazları kendisi tespit eder.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning={true} className={cn("font-sans", jakarta.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </body>
    </html>
  )
}
