'use client';
import { useRouter } from 'next/navigation'
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api';
import { useGetMeQuery } from '@/features/auth/meApi';
import { toast } from 'react-toastify';
import NotificationBell from './NotificationBell';
import { supabase } from '@/lib/supabaseClient';
import { disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutGrid, LogOut } from 'lucide-react';

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
    const { data: me } = useGetMeQuery();

    const handleLogout = async () => {
        localStorage.removeItem('token');
        disconnectSocket();
        // Google ile giris yapildiysa Supabase'in kendi session'i da temizlenmeli,
        // yoksa tekrar "Google ile giris yap" hesap secmeden ayni kullaniciyla oturum acar
        if (supabase) {
          await supabase.auth.signOut();
        }
        window.dispatchEvent(new Event('auth:changed'));
        dispatch(api.util.resetApiState());
        toast.success('Çıkış yapıldı');
        router.push('/login');
    };
    return (
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/projects"
              className="group flex items-center gap-2.5 rounded-lg transition-colors hover:text-primary"
            >
              {/* Marka isareti: metin logonun tek basina kalmasini engelliyor */}
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-transform duration-200 group-hover:-rotate-6">
                <LayoutGrid className="size-4" />
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground">Tello</span>
            </Link>

            <div className="flex items-center gap-1">
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
        </header>
    );
}
