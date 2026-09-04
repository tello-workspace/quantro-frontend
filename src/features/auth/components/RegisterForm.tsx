// src/features/auth/components/RegisterForm.tsx
'use client';

import React, { useState } from 'react';
import { useRegisterMutation } from '../authApi';
import { toast } from "sonner";
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { GoogleIcon } from './GoogleIcon';
import { authInputClass, authLabelClass } from './LoginForm';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Basarili yanit artik otomatik yonlendirme yerine bir bilgi ekrani gosteriyor;
  // sebebi asagida handleSubmit'teki notta.
  const [basariMsg, setBasariMsg] = useState('');

  const [registerUser, { isLoading }] = useRegisterMutation();

  const handleGoogleRegister = async () => {
    if (!supabase) {
      toast.error('Google girişi için Supabase ayarları eksik.');
      return;
    }

    // Bkz. LoginForm'daki ayni not: eski Supabase oturumu temizlenmezse,
    // OAuth iptal edildiginde /auth/callback o oturumu okuyup yanlis hesaba
    // giris yapiyordu.
    try {
      await supabase.auth.signOut();
    } catch {
      // Callback tarafindaki hata kontrolu ikinci savunma hatti.
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      toast.error(`Google ile kayıt başlatılamadı: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== passwordConfirm) {
      setErrorMsg('Şifreler birbiriyle uyuşmuyor.');
      return;
    }

    try {
      await registerUser({ name, email, password }).unwrap();

      // Backend, hesap numaralandirmasini onlemek icin e-posta ZATEN kayitliysa da
      // ayni basarili yaniti donuyor (auth.service.ts register) - yani bu yanit
      // "hesap olusturuldu" anlamina gelmiyor. Eskiden burada kosulsuz "Kayit
      // basarili! Giris yapabilirsiniz." denip /login'e yonlendiriliyordu; sifresini
      // unuttugunu fark etmeyen kullanici yeni sifresiyle giris deneyip hiz sinirina
      // takiliyor ve hicbir yerde "sifreni sifirla" ipucu goremiyordu. Mesaji
      // notrlestirip her iki yolu da acik biraktik; numaralandirma korumasi bozulmuyor
      // cunku metin adresin kayitli olup olmadigini yine soylemiyor.
      setBasariMsg(
        'İşlem alındı. Bu adres yeniyse hesabın oluşturuldu ve giriş yapabilirsin. ' +
          'Adres daha önce kayıt olduysa mevcut şifrenle giriş yap ya da şifreni sıfırla.'
      );
      toast.success('İşlem alındı.');
      return;
    } catch (err: any) {
      const errData = err?.data?.error;
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  // Formu gizleyip iki secenegi de kalici olarak gosteriyoruz: onceki 1.5 saniyelik
  // otomatik yonlendirmede kullanicinin "sifreni sifirla" yolunu okumasina firsat yoktu.
  if (basariMsg) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">Kaydın alındı</h1>
        </div>

        <div
          role="status"
          className="mb-6 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground"
        >
          {basariMsg}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_var(--color-primary)] transition-opacity hover:opacity-90"
          >
            Giriş yap
          </Link>
          <Link
            href="/forgot-password"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Şifremi sıfırla
          </Link>
        </div>
      </div>
    );
  }

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
