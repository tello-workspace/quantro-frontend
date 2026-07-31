import AuthenticatedShell from "@/components/AuthenticatedShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
