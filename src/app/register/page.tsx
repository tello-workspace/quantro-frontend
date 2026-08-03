import RegisterForm from '@/features/auth/components/RegisterForm';
import { AuthShell } from '@/features/auth/components/AuthShell';

export default function RegisterPage() {
  return (
    <AuthShell tagline="Ekibini davet et, ilk projeni dakikalar içinde kur.">
      <RegisterForm />
    </AuthShell>
  );
}
