'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
  const [checked, setChecked] = useState(false);
  const publicRoute = isPublicRoute(pathname);

  useEffect(() => {
    if (publicRoute) {
      setChecked(true);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setChecked(true);
  }, [publicRoute, router]);

  if (!checked) {
    return null;
  }

  if (publicRoute) {
    return children;
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
