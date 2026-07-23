import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("coach");
  return <AppShell role="coach" user={user}>{children}</AppShell>;
}
