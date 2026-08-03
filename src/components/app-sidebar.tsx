'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LayoutGrid, ListChecks, UserCircle, ChevronsUpDown, FolderKanban, Check, SlidersHorizontal } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useGetMyOrganizationsQuery, useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetProjectsQuery } from '@/features/projects/projectsApi';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/projects', label: 'Panolarım', icon: LayoutGrid },
  { href: '/dashboard', label: 'Bana Atananlar', icon: ListChecks },
  { href: '/profile', label: 'Profil', icon: UserCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('orgId');

  const { data: orgs = [] } = useGetMyOrganizationsQuery();
  const { data: org } = useGetOrganizationByIdQuery({ orgId: orgId ?? '' }, { skip: !orgId });
  const isAdmin = org?.myRole === 'ADMIN';
  const { data: projects = [] } = useGetProjectsQuery({ orgId: orgId ?? '' }, { skip: !orgId });

  // Aktif org secimi: query'deki orgId yoksa ilk organizasyon
  const activeOrgId = orgId ?? orgs[0]?.id;
  const [orgSelectOpen, setOrgSelectOpen] = useState(false);

  // Aktif org degisince projeleri o org'un projeleriyle listele
  const activeOrgProjects = projects;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        {/* Organizasyon seçici */}
        <SidebarGroup>
          <SidebarGroupLabel>Organizasyon</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOrgSelectOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="truncate font-medium">
                  {orgs.find((o) => o.id === activeOrgId)?.name ?? 'Organizasyon seç'}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/50" />
              </button>

              {orgSelectOpen && (
                <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-lg">
                  {orgs.map((o) => (
                    <Link
                      key={o.id}
                      href={`/projects?orgId=${o.id}`}
                      onClick={() => setOrgSelectOpen(false)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                        o.id === activeOrgId ? 'font-medium text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span className="truncate">{o.name}</span>
                      {o.id === activeOrgId && <Check className="size-3.5 shrink-0 text-primary" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ana menü */}
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

        {/* PROJELER — ana menüye girmeden hızlı geçiş */}
        {activeOrgId && (
          <SidebarGroup>
            <SidebarGroupLabel>Projeler</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeOrgProjects.length === 0 && (
                  <p className="px-2 py-1 text-xs text-sidebar-foreground/50">
                    Bu organizasyonda proje yok
                  </p>
                )}
                {activeOrgProjects.map((project) => {
                  const isActive =
                    pathname === `/projects/${project.id}` ||
                    pathname?.startsWith(`/projects/${project.id}/`);
                  const isOnManagePage = pathname === `/projects/${project.id}/manage`;
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton asChild isActive={isActive && !isOnManagePage} tooltip={project.name}>
                        <Link href={`/projects/${project.id}?orgId=${activeOrgId}`}>
                          <FolderKanban />
                          <span>{project.name}</span>
                        </Link>
                      </SidebarMenuButton>

                      {/* Proje secildiginde yonetici perm'i varsa Yönetim linki */}
                      {isAdmin && isActive && (
                        <SidebarMenuButton asChild isActive={isOnManagePage} tooltip="Yönetim" className="ml-3">
                          <Link href={`/projects/${project.id}/manage?orgId=${activeOrgId}`}>
                            <SlidersHorizontal />
                            <span>Yönetim</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
