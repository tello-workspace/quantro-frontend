'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVerifyEmailMutation } from '@/features/auth/authApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid, Loader2 } from 'lucide-react';

interface ApiError {
  data?: { error?: { code: string; message: string } };
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  const [verifyEmail] = useVerifyEmailMutation();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Geçersiz bağlantı. Lütfen doğrulama linkini yeniden isteyin.');
      return;
    }

    verifyEmail({ token })
      .unwrap()
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/login'), 2000);
      })
      .catch((err) => {
        const apiError = err as ApiError;
        setStatus('error');
        setErrorMsg(apiError?.data?.error?.message || 'Doğrulama başarısız. Bağlantının süresi dolmuş olabilir.');
      });
    // token degismedigi surece bir kez calissin - verifyEmail referansi her render'da yeniden olusabiliyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-primary/5 via-background to-accent/20 px-4">
      <div className="relative w-full max-w-md">
        <div
          aria-hidden
          className="absolute -inset-3 -z-10 rounded-3xl bg-linear-to-r from-primary/25 via-chart-3/20 to-chart-2/25 blur-2xl"
        />
        <Card className="relative w-full max-w-md shadow-soft-lg">
          <CardHeader className="pb-2 text-center">
            <span className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <LayoutGrid className="size-5" />
            </span>
            <CardTitle className="text-xl">Email Doğrulama</CardTitle>
            <CardDescription>
              {status === 'pending' && 'Email adresin doğrulanıyor...'}
              {status === 'success' && 'Email adresin doğrulandı! 🎉'}
              {status === 'error' && 'Doğrulama başarısız oldu.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-center">
            {status === 'pending' && (
              <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
            )}
            {status === 'success' && (
              <p className="text-sm text-muted-foreground">Giriş sayfasına yönlendiriliyorsun...</p>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            ← Girişe dön
          </Link>
        </p>
      </div>
    </div>
  );
}
