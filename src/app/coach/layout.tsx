import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";
import { loadDashboardShell } from "@/lib/dashboard-shell";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("coach");
  const shell = await loadDashboardShell(session.id);
  return <AppShell role="coach" {...shell}>{children}</AppShell>;
}
