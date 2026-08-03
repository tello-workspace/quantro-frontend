// src/app/login/page.tsx
import LoginForm from "@/features/auth/components/LoginForm";
import { AuthShell } from "@/features/auth/components/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell tagline="Projelerini ve ekibini tek panoda yürüt.">
      <LoginForm />
    </AuthShell>
  );
}
