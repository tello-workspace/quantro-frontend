// src/app/login/page.tsx
import LoginForm from "@/features/auth/components/LoginForm";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { QuantroMark, QUANTRO_MARK_COLOR } from "@/components/ui/quantro-logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-primary/5 via-background to-accent/20 px-4">
      <div className={`mb-1 flex size-14 items-center justify-center rounded-2xl border border-border bg-card p-3 shadow-soft ${QUANTRO_MARK_COLOR}`}>
        <QuantroMark />
      </div>
      <div className="h-28 w-full max-w-md sm:h-36">
        <TextHoverEffect text="Quantro" />
      </div>
      <LoginForm />
      <p className="mt-4 text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Kayıt Ol
        </Link>
      </p>
    </div>
  );
}