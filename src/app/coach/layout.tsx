import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";
import { loadDashboardShell, loadActiveClients } from "@/lib/dashboard-shell";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("coach");
  const [shell, activeClients] = await Promise.all([loadDashboardShell(session.id), loadActiveClients()]);
  return <AppShell role="coach" {...shell} activeClients={activeClients}>{children}</AppShell>;
}
