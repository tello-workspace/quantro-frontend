// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const syncSession = async () => {
      if (!supabase) {
        setErrorMsg('Google ile giriş tamamlanamadı (Supabase eksik).');
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (error || !accessToken) {
        setErrorMsg('Google ile giriş tamamlanamadı.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/oauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Giriş yapılamadı.');
        }

        localStorage.setItem('token', json.data.token);
        toast.success('Giriş yapıldı!');
        router.push('/projects');
      } catch {
        setErrorMsg('Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    };

    syncSession();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/20 px-4">
      {errorMsg ? (
        <div className="text-center">
          <p className="text-destructive mb-4">{errorMsg}</p>
          <Button variant="link" onClick={() => router.push('/login')}>
            Giriş sayfasına dön
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">Giriş yapılıyor...</p>
      )}
    </div>
  );
}
