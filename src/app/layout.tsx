import type { Metadata } from 'next'
import StoreProvider from '@/lib/StoreProvider'
import { SocketProvider } from '@/lib/socket'
import { ConfirmProvider } from '@/hooks/useConfirm'
import NotificationListener from '@/components/NotificationListener'
import { Toaster } from 'sonner'
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
        <StoreProvider>
          <SocketProvider>
            <ConfirmProvider>
              {children}
              <NotificationListener />
            </ConfirmProvider>
          </SocketProvider>
        </StoreProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast:
                "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-soft-md group-[.toaster]:rounded-xl group-[.toaster]:font-sans group-[.toaster]:text-sm",
              title: "text-foreground font-medium",
              description: "text-muted-foreground text-xs",
              actionButton: "bg-primary text-primary-foreground rounded-lg text-xs px-3 py-1 font-medium",
              cancelButton: "bg-muted text-muted-foreground rounded-lg text-xs px-3 py-1 font-medium",
              error: "group toast group-[.toaster]:!border-destructive/30 group-[.toaster]:!bg-destructive/5 group-[.toaster]:!text-foreground [&_[data-icon]]:!text-destructive",
              success: "group toast group-[.toaster]:!border-emerald-500/30 group-[.toaster]:!bg-emerald-500/5 group-[.toaster]:!text-foreground [&_[data-icon]]:!text-emerald-500",
              warning: "group toast group-[.toaster]:!border-amber-500/30 group-[.toaster]:!bg-amber-500/5 group-[.toaster]:!text-foreground [&_[data-icon]]:!text-amber-500",
              info: "group toast group-[.toaster]:!border-sky-500/30 group-[.toaster]:!bg-sky-500/5 group-[.toaster]:!text-foreground [&_[data-icon]]:!text-sky-500",
            },
          }}
        />
      </body>
    </html>
  )
}
