'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Columns3,
  LayoutGrid,
  ListChecks,
  SlidersHorizontal,
  UserCircle,
} from 'lucide-react';
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

// /projects/<id>/... altindaysak proje id'sini cikarir. /projects ve
// /projects/new proje sayfasi degil, o yuzden null doner.
function projectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'projects' || segments.length < 2) return null;
  if (segments[1] === 'new') return null;
  return segments[1];
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('orgId');
  const activeProjectId = projectIdFromPath(pathname);
  const tab = searchParams?.get('tab');

  const withOrg = (href: string) => (orgId ? `${href}${href.includes('?') ? '&' : '?'}orgId=${orgId}` : href);

  const projectItems = activeProjectId
    ? [
        { href: `/projects/${activeProjectId}`, label: 'Pano', icon: Columns3, exact: true },
        { href: `/projects/${activeProjectId}/manage`, label: 'Yönetim', icon: SlidersHorizontal },
        { href: `/projects/${activeProjectId}/insights`, label: 'İçgörüler', icon: BarChart3 },
        { href: `/projects/${activeProjectId}/activity`, label: 'Aktivite', icon: Activity },
      ]
    : [];

  // Yonetim sayfasindaki sekmeler de kisayol olarak sidebar'a cikiyor:
  // otomasyon/ek alan/triage'a panodan tek tikla ulasilabilsin.
  const manageTabs = activeProjectId
    ? [
        { key: 'sprints', label: 'Sprintler' },
        { key: 'automations', label: 'Otomasyonlar' },
        { key: 'fields', label: 'Ek Alanlar' },
        { key: 'triage', label: 'Triage' },
      ]
    : [];

  const onManagePage = !!activeProjectId && pathname === `/projects/${activeProjectId}/manage`;

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
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={withOrg(item.href)}>
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

        {projectItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Proje</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={withOrg(item.href)}>
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
        )}

        {manageTabs.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Yönetim</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {manageTabs.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={onManagePage && (tab ?? 'sprints') === item.key}
                      tooltip={item.label}
                    >
                      <Link href={withOrg(`/projects/${activeProjectId}/manage?tab=${item.key}`)}>
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
