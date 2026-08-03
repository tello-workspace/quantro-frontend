// src/features/auth/components/RegisterForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterMutation } from '../authApi';
import { toast } from "sonner";
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { GoogleIcon } from './GoogleIcon';
import { authInputClass, authLabelClass } from './LoginForm';

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [registerUser, { isLoading }] = useRegisterMutation();

  const handleGoogleRegister = async () => {
    if (!supabase) {
      toast.error('Google girişi için Supabase ayarları eksik.');
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== passwordConfirm) {
      setErrorMsg('Şifreler birbiriyle uyuşmuyor.');
      return;
    }

    try {
      const result = await registerUser({ name, email, password }).unwrap();

      // Artık doğrulama gerekmiyor - doğrudan login sayfasına yönlendir
      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    } catch (err: any) {
      const errData = err?.data?.error;
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">Hesap oluştur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Projelerini yönetmeye başlamak için birkaç saniye yeterli.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleRegister}
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
          <label htmlFor="reg-name" className={authLabelClass}>Ad Soyad</label>
          <input
            id="reg-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className={authInputClass}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="reg-email" className={authLabelClass}>E-posta adresi</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@quantro.com"
            className={authInputClass}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="reg-password" className={authLabelClass}>Şifre</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="reg-password2" className={authLabelClass}>Şifre tekrar</label>
          <input
            id="reg-password2"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_var(--color-primary)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
        >
          {isLoading ? 'Kaydediliyor...' : 'Devam et'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
