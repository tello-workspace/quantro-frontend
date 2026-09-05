'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForgotPasswordMutation } from '@/features/auth/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid, Loader2, MailCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// fetchBaseQuery hatasinin okudugumuz alanlari: HTTP durumu ve backend'in
// { success:false, error:{ code, message } } zarfi.
interface ApiError {
  status?: number | string;
  data?: { error?: { code?: string; message?: string } };
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    // Backend kullanici enumeration'ini onlemek icin gecerli/gecersiz email
    // farketmeksizin ayni basarili yaniti doner - ama bu "hic hata donmez"
    // demek degil: uc checkRateLimit'ten geciyor ve pencere dolunca 429
    // donuyor, ayrica ag kopuklugu/5xx de mumkun. Eskiden tum hatalar
    // yutulup kosulsuz onay ekrani aciliyordu; kullanici hic gonderilmemis
    // bir e-postayi bekliyordu. Artik yalnizca gercekten basarili yanitta
    // onay ekranina geciyoruz, aksi halde hatayi gosterip tekrar denemesine
    // izin veriyoruz. Enumeration korumasi zaten backend tarafinda.
    try {
      await forgotPassword({ email }).unwrap();
      setSent(true);
    } catch (err) {
      const apiError = err as ApiError;
      // 429 yanitindaki sunucu mesaji "X dakika sonra tekrar deneyin" gibi
      // somut bir sure tasiyor; varsa onu goster, yoksa ceviriye dus.
      setErrorMsg(
        apiError?.data?.error?.message ||
          (apiError?.status === 429 ? t('forgotPasswordRateLimited') : t('forgotPasswordError')),
      );
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
            <CardTitle className="text-xl">{t('forgotPasswordTitle')}</CardTitle>
            <CardDescription>{t('forgotPasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <MailCheck className="size-8 text-primary" />
                <p className="text-sm text-foreground">{t('forgotPasswordSentMsg')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* role="alert" ile ekran okuyucu da sahte basari yerine
                    gercek sonucu duyurur. */}
                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">{t('emailLabel')}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@quantro.com"
                    className="h-10"
                    required
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="h-10 w-full cursor-pointer">
                  {isLoading && <Loader2 className="size-4 animate-spin" />}
                  {isLoading ? t('sending') : t('sendResetLink')}
                </Button>
              </form>
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
