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
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutGrid, LogOut } from 'lucide-react';

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
        dispatch(api.util.resetApiState());
        toast.success('Çıkış yapıldı');
        router.push('/login');
    };
    return (
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/projects"
              className="group flex items-center gap-2.5 rounded-lg transition-colors hover:text-primary"
            >
              {/* Marka isareti: metin logonun tek basina kalmasini engelliyor */}
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-transform duration-200 group-hover:-rotate-6">
                <LayoutGrid className="size-4" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-bold tracking-tight text-foreground">Tello</span>
                {me && (
                  <span className="mt-0.5 text-xs text-muted-foreground">{me.name}</span>
                )}
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
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
