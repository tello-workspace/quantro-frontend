'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api';
import { useGetMeQuery } from '@/features/auth/meApi';
import { toast } from "sonner";
import NotificationBell from './NotificationBell';
import { supabase } from '@/lib/supabaseClient';
import { disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutGrid, LogOut, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGetMyOrganizationsQuery } from '@/features/organizations/organizationsApi';
import { OrgSearchDialog } from '@/features/organizations/components/OrgSearchDialog';

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

export default function Header(){
    const router = useRouter();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { data: me } = useGetMeQuery();
    const { data: orgs } = useGetMyOrganizationsQuery();
    
    const [showSearch, setShowSearch] = useState(false);

    const queryOrgId = searchParams?.get('orgId');
    const activeOrgId = queryOrgId || orgs?.[0]?.id;

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/projects"
              className="group flex items-center gap-2.5 rounded-lg transition-colors hover:text-primary shrink-0"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-transform duration-200 group-hover:-rotate-6">
                <LayoutGrid className="size-4" />
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground">Quantro</span>
            </Link>

            {/* Global Search Box */}
            <div className="flex-1 max-w-sm sm:max-w-md mx-auto">
              {activeOrgId ? (
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/40 border border-border/80 rounded-xl hover:bg-muted/80 hover:border-primary/30 transition-all cursor-pointer shadow-soft-sm"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-3.5 sm:size-4 text-muted-foreground/80" />
                    <span>Organizasyonda ara...</span>
                  </span>
                  <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[9px] font-medium text-muted-foreground/80">
                    <span>⌘</span>K
                  </kbd>
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <NotificationBell />
              {me && (
                <Link
                  href="/profile"
                  title="Profilim"
                  className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
                >
                  <Avatar size="sm">
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
                <span className="hidden sm:inline">Çıkış yap</span>
              </Button>
            </div>
          </div>

          {activeOrgId && (
            <OrgSearchDialog
              orgId={activeOrgId}
              open={showSearch}
              onOpenChange={setShowSearch}
            />
          )}
        </header>
    );
}
