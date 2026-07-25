import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";
import { loadDashboardShell } from "@/lib/dashboard-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("client");
  const shell = await loadDashboardShell(session.id);
  return <AppShell role="client" {...shell}>{children}</AppShell>;
}
