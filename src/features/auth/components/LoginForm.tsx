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
      {/* Dönen RGB border efekti */}
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] bg-[length:200%_200%] animate-spin-slow opacity-75 blur-[2px]" />
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] bg-[length:200%_200%] animate-spin-slower" />
    <Card className="w-full max-w-md relative">
      <CardHeader className="text-center pb-0">
        <CardTitle className="text-xl">Tello&apos;ya Giriş Yap</CardTitle>
        <CardDescription className="text-xs">Projelerini ve görevlerini yönetmeye hemen başla.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {errorMsg && (
          <div className="mb-3 p-2.5 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">E-posta Adresi</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@tello.com"
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-8 text-sm"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-8 text-sm">
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground">veya</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full h-8 gap-2 text-sm"
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
