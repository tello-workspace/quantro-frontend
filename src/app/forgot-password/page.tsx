'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForgotPasswordMutation } from '@/features/auth/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid, Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Backend her zaman ayni basarili yaniti dondurur (kullanici enumeration
    // riskini onlemek icin) - burada catch'e dusmesi zaten beklenmiyor.
    await forgotPassword({ email }).unwrap().catch(() => {});
    setSent(true);
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
            <CardTitle className="text-xl">Şifreni mi unuttun?</CardTitle>
            <CardDescription>
              E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <MailCheck className="size-8 text-primary" />
                <p className="text-sm text-foreground">
                  Bu email adresi kayıtlıysa, birazdan gelen kutunda bir şifre sıfırlama bağlantısı bulacaksın.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">E-posta adresi</Label>
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
                  {isLoading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
                </Button>
              </form>
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
