import RegisterForm from '@/features/auth/components/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
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