// src/app/login/page.tsx
import LoginForm from "@/features/auth/components/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-primary/5 via-background to-accent/20 px-4">
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