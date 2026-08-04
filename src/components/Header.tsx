'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api';
import { useGetMeQuery } from '@/features/auth/meApi';
import { toast } from "sonner";
import { useTranslation } from '@/hooks/useTranslation';
import NotificationBell from './NotificationBell';
import { supabase } from '@/lib/supabaseClient';
import { disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, Search, ListChecks, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { QuantroMark, QUANTRO_MARK_COLOR } from '@/components/ui/quantro-logo';
import { CommandPalette } from '@/components/CommandPalette';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useGetMyOrganizationsQuery, useLazySearchOrganizationQuery } from '@/features/organizations/organizationsApi';

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

// /projects/<id>/... altindaysak proje id'si. Palet proje-kapsamli
// komutlari (Yonetim/Icgoruler/Aktivite) yalnizca o zaman gosteriyor.
function projectIdFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const parcalar = pathname.split('/').filter(Boolean);
  if (parcalar[0] !== 'projects' || parcalar.length < 2) return undefined;
  if (parcalar[1] === 'new') return undefined;
  return parcalar[1];
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

export default function Header(){
    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch();
    const { toggleSidebar } = useSidebar();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { data: me } = useGetMeQuery();
    const { data: orgs } = useGetMyOrganizationsQuery();
    const [trigger, { data: results, isFetching }] = useLazySearchOrganizationQuery();
    
    const [q, setQ] = useState('');
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const queryOrgId = searchParams?.get('orgId');
    const activeOrgId = queryOrgId || orgs?.[0]?.id;

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        localStorage.removeItem('token');
        disconnectSocket();
        if (supabase) {
          await supabase.auth.signOut();
        }
        window.dispatchEvent(new Event('auth:changed'));
        dispatch(api.util.resetApiState());
        toast.success('Çıkış yapıldı');
        router.push('/login');
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global shortcut Ctrl+K / Cmd+K to focus input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                // Ctrl+K onceden yalnizca ustteki arama kutusuna odaklaniyordu;
                // artik komut paletini aciyor (arama + sayfalar arasi gecis).
                setIsPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Search query trigger
    useEffect(() => {
        const trimmed = q.trim();
        if (trimmed.length < 2 || !activeOrgId) return;

        const handle = setTimeout(() => {
            trigger({ orgId: activeOrgId, q: trimmed });
        }, 300);
        return () => clearTimeout(handle);
    }, [q, activeOrgId, trigger]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            inputRef.current?.blur();
            setIsFocused(false);
        }
    };

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-1 shrink-0">
              {/* Hamburger: menuyu acip kapatan TEK ve acik dugme. Eskiden bu
                  isi Quantro logosu yapiyordu - logo tiklaninca menu aciliyor,
                  ana sayfaya gitmiyordu. Logonun beklenen davranisi ana sayfaya
                  gitmektir; menu icin ayri bir dugme olmasi gerekiyor. */}
              <button
                type="button"
                onClick={toggleSidebar}
                title={t('toggleMenu')}
                aria-label={t('toggleMenu')}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Menu className="size-5" />
              </button>
              <Link
                href="/dashboard"
                title={t('goHome')}
                aria-label={t('goHome')}
                className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:text-primary"
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg border border-border bg-background p-1.5 shadow-soft transition-transform duration-200 group-hover:-rotate-6',
                    QUANTRO_MARK_COLOR,
                  )}
                >
                  <QuantroMark />
                </span>
                <span className="hidden text-sm font-medium tracking-[-0.02em] text-foreground sm:inline">
                  Quantro
                </span>
              </Link>
            </div>

            {/* Global Search Input & Google Suggestions-like Dropdown */}
            <div ref={containerRef} className="flex-1 max-w-60 xs:max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto relative">
              {activeOrgId ? (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 size-3.5 sm:size-4 text-muted-foreground/60" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setIsFocused(true);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={t('searchPlaceholder')}
                      className="w-full pl-9 pr-12 py-1.5 text-xs sm:text-sm bg-muted/45 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 focus:bg-background transition-all shadow-soft-sm text-foreground"
                    />
                    <kbd className="absolute right-3 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[9px] font-medium text-muted-foreground/80">
                      <span>⌘</span>K
                    </kbd>
                  </div>

                  {/* Suggestion Dropdown */}
                  {isFocused && q.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 max-h-80 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-soft-xl z-50 p-2 flex flex-col gap-1">
                      {isFetching && (
                        <div className="p-3 space-y-2">
                          <div className="h-10 bg-muted/60 animate-pulse rounded-lg w-full" />
                          <div className="h-10 bg-muted/60 animate-pulse rounded-lg w-full" />
                        </div>
                      )}

                      {!isFetching && results?.length === 0 && (
                        <p className="p-4 text-center text-xs sm:text-sm text-muted-foreground">{t('noResults')}</p>
                      )}

                      {!isFetching &&
                        results?.map((card) => (
                          <Link
                            key={card.id}
                            href={`/projects/${card.projectId}?orgId=${activeOrgId}&openCard=${card.id}`}
                            onClick={() => {
                              setIsFocused(false);
                              setQ('');
                            }}
                            className="flex flex-col gap-1 rounded-lg border border-transparent p-2 text-xs sm:text-sm transition-colors hover:bg-muted hover:border-border"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground line-clamp-1">{card.title}</span>
                              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-muted border border-border shrink-0">
                                {PRIORITY_LABEL[card.priority] ?? card.priority}
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {card.projectName} · {card.columnName}
                            </span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/dashboard"
                title="Bana Atananlar"
                className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ListChecks className="size-4" />
              </Link>
              <ThemeToggle />
              <NotificationBell />
              {me && (
                <Link
                  href="/profile"
                  title={t('myProfile')}
                  className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
                >
                  <Avatar size="sm">
                    {me.avatarUrl && <AvatarImage src={me.avatarUrl} alt={me.name} />}
                    <AvatarFallback>{initials(me.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-medium text-foreground sm:inline">{me.name}</span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </div>
          </div>

          <CommandPalette
            open={isPaletteOpen}
            onOpenChange={setIsPaletteOpen}
            orgId={activeOrgId}
            projectId={projectIdFromPath(pathname)}
          />
        </header>
    );
}
