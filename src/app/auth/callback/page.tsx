// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const syncSession = async () => {
      if (!supabase) {
        setErrorMsg(t('oauthMissingSupabase'));
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (error || !accessToken) {
        setErrorMsg(t('oauthFailed'));
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
          throw new Error(json.error?.message || t('oauthGenericError'));
        }

        localStorage.setItem('token', json.data.token);
        // Onceki kullanicinin cache'i yeni token ile gosterilmesin (bkz. LoginForm).
        dispatch(api.util.resetApiState());
        window.dispatchEvent(new Event('auth:changed'));
        toast.success(t('oauthSuccess'));
        router.push('/projects');
      } catch {
        setErrorMsg(t('oauthGenericError'));
      }
    };

    syncSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, dispatch]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/20 px-4">
      {errorMsg ? (
        <div className="text-center">
          <p className="text-destructive mb-4">{errorMsg}</p>
          <Button variant="link" onClick={() => router.push('/login')}>
            {t('backToLoginPage')}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">{t('oauthSigningIn')}</p>
      )}
    </div>
  );
}
