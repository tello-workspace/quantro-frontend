// src/features/auth/components/LoginForm.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useLoginMutation, useResendVerificationMutation } from '../authApi';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

interface ApiError {
  data?: {
    error?: {
      code: string;
      message: string;
    };
  };
}

interface LoginResponse {
  data?: { token?: string };
  token?: string;
}

// Giris/kayit formlarinda ortak alan stili. Tasarim daha genis dokunma
// alani istiyor (h-12, rounded-xl); tema token'lari uzerinden yazildigi
// icin acik ve koyu temada ayni sekilde calisiyor.
export const authInputClass =
  'w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground ' +
  'outline-none transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30';

export const authLabelClass = 'mb-2 block text-sm font-medium text-foreground';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    if (!supabase) {
      toast.error('Google girişi için Supabase ayarları eksik.');
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setNeedsVerification(false);

    try {
      const response = await login({ email, password }).unwrap();

      const resp = response as LoginResponse;
      const token = resp.data?.token ?? resp.token;
      if (token) {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('auth:changed'));
        toast.success('Giriş yapıldı!');
        router.push('/projects');
      } else {
        setErrorMsg('Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errData = apiError?.data?.error;
      if (errData?.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      }
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Giriş yapılırken bir hata oluştu.');
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification({ email }).unwrap();
      toast.success('Doğrulama bağlantısı yeniden gönderildi.');
    } catch {
      toast.error('Bağlantı gönderilemedi, lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">Giriş yap</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tekrar hoş geldin. Devam etmek için giriş yap.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMsg}
          {needsVerification && (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="mt-1.5 block font-medium underline underline-offset-2 disabled:opacity-50"
            >
              {isResending ? 'Gönderiliyor...' : 'Doğrulama bağlantısını yeniden gönder'}
            </button>
          )}
        </div>
      )}

      {/* Google once: kullanicilarin cogu tek tikla girmeyi tercih ediyor,
          e-posta formu ikincil yol olarak altta duruyor. */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <GoogleIcon />
        Google ile devam et
      </button>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">veya</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="login-email" className={authLabelClass}>
            E-posta adresi
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@quantro.com"
            className={authInputClass}
            required
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Şifre
            </label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Şifremi unuttum
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_var(--color-primary)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? 'Giriş yapılıyor...' : 'Devam et'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
