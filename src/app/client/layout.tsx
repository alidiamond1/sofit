import { getBilling } from "@/lib/payments/billing";
import { PaymentAccessBoundary } from "@/components/payments/payment-access";
import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth/session";
import { loadDashboardShell } from "@/lib/dashboard-shell";

export const maxDuration = 60;

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("client");
  const billing = await getBilling(session.id);
  const shell = await loadDashboardShell(session.id, !billing.unlocked);
  return <PaymentAccessBoundary locked={!billing.unlocked}><AppShell role="client" {...shell}>{children}</AppShell></PaymentAccessBoundary>;
}
