'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useResetPasswordMutation } from '@/features/auth/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ApiError {
  data?: { error?: { code: string; message: string } };
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg(t('passwordMismatch'));
      return;
    }

    try {
      await resetPassword({ token, password }).unwrap();
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const apiError = err as ApiError;
      setErrorMsg(apiError?.data?.error?.message || t('resetPasswordError'));
    }
  };

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
            <CardTitle className="text-xl">{t('resetPasswordTitle')}</CardTitle>
            <CardDescription>{t('resetPasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!token ? (
              <p className="py-4 text-center text-sm text-destructive">{t('resetPasswordInvalidLink')}</p>
            ) : done ? (
              <p className="py-4 text-center text-sm text-foreground">{t('resetPasswordDone')}</p>
            ) : (
              <>
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
                    <Label htmlFor="new-password">{t('newPasswordLabel')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">{t('newPasswordConfirmLabel')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10"
                      minLength={6}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="h-10 w-full cursor-pointer">
                    {isLoading && <Loader2 className="size-4 animate-spin" />}
                    {isLoading ? t('saving') : t('updatePassword')}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            {t('backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
