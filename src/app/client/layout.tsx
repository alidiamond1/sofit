import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client");
  return <AppShell role="client" user={user}>{children}</AppShell>;
}
