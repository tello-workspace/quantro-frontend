import AuthenticatedShell from "@/components/AuthenticatedShell";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
