import RegisterForm from '@/features/auth/components/RegisterForm';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import { QuantroMark, QUANTRO_MARK_COLOR } from '@/components/ui/quantro-logo';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20 px-4">
      <div className={`mb-1 flex size-14 items-center justify-center rounded-2xl border border-border bg-card p-3 shadow-soft ${QUANTRO_MARK_COLOR}`}>
        <QuantroMark />
      </div>
      <div className="h-28 w-full max-w-md sm:h-36">
        <TextHoverEffect text="Quantro" />
      </div>
      <RegisterForm />
      <p className="mt-4 text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}