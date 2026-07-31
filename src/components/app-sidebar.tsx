'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, ListChecks, UserCircle } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { href: '/projects', label: 'Panolarım', icon: LayoutGrid },
  { href: '/dashboard', label: 'Bana Atananlar', icon: ListChecks },
  { href: '/profile', label: 'Profil', icon: UserCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('orgId');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/projects"
          className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:text-primary"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:-rotate-6">
            <LayoutGrid className="size-3.5" />
          </span>
          <span className="text-sm font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
            Quantro
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const href = orgId ? `${item.href}?orgId=${orgId}` : item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
