import AuthenticatedShell from "@/components/AuthenticatedShell";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
