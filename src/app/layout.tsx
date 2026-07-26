import type { Metadata } from 'next'
import StoreProvider from '@/lib/StoreProvider'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Tello',
  description: 'Sana konuşan proje panosu — stale kartları, iş yükünü ve darboğazları kendisi tespit eder.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning={true} className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
        <ToastContainer position="top-right" autoClose={3000} />
      </body>
    </html>
  )
}
