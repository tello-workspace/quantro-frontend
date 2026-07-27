// src/features/auth/components/LoginForm.tsx
"use client";

import React, { useState } from 'react';
import { useLoginMutation } from '../authApi';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Loader2 } from 'lucide-react';

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

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [login, { isLoading }] = useLoginMutation();
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

    try {
      const response = await login({ email, password }).unwrap();

      const resp = response as LoginResponse;
      const token = resp.data?.token ?? resp.token;
      if (token) {
        localStorage.setItem('token', token);
        toast.success('Giriş yapıldı!');
        router.push('/projects');
      } else {
        setErrorMsg('Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errData = apiError?.data?.error;
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Giriş yapılırken bir hata oluştu.');
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Kart cevresinde yumusak marka parlamasi (donen RGB serit yerine:
          o serit formu okumayi zorlastiriyordu) */}
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rounded-3xl bg-linear-to-r from-primary/25 via-chart-3/20 to-chart-2/25 blur-2xl"
      />
      <Card className="relative w-full max-w-md shadow-soft-lg">
        <CardHeader className="pb-2 text-center">
          <span className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <LayoutGrid className="size-5" />
          </span>
          <CardTitle className="text-xl">Tello&apos;ya giriş yap</CardTitle>
          <CardDescription>Projelerini ve görevlerini yönetmeye hemen başla.</CardDescription>
        </CardHeader>
      <CardContent className="pt-4">
        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-posta adresi</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@tello.com"
              className="h-10"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Şifre</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="h-10 w-full cursor-pointer">
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
            <span className="bg-card px-2 text-muted-foreground">veya</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="h-10 w-full cursor-pointer gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z" />
            <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google ile giriş yap
        </Button>
      </CardContent>
      </Card>
    </div>
  );
}
