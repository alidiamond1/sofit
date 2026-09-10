import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { snapshotOf } from "@/lib/payments/billing";
import { amountInCents, hasPaidAccess } from "@/lib/payments/rules";
import { CoachPaymentsWorkspace } from "./coach-payments";
import { assignmentState, type CoachInvoice } from "@/lib/payments/coach-invoices";
import { CoachAssignmentsWorkspace } from "./coach-assignments";

export async function CoachPaymentsPage({ assignments = false }: { assignments?: boolean } = {}) {
  await requireRole("coach");
  // ponytail: client-side filtering suits this solo coaching business; move filters and pagination to SQL if invoice volume grows.
  const rows = await database()("invoices as i")
    .join("clients as c", "c.id", "i.client_id").join("users as u", "u.id", "c.user_id")
    .leftJoin("services as s", "s.id", "i.service_id")
    .select("i.id", "i.client_id", "i.number", "i.amount", "i.currency", "i.status", "i.created_at", "i.due_on", "i.paid_at", "i.access_until", "i.provider_sid", "i.package_snapshot", "i.client_viewed_at", "c.current_invoice_id", "c.status as client_status", "u.is_active", "u.approval_status", "u.name", "u.email", "s.name as service_name", "s.billing_interval as service_interval")
    .orderBy("i.created_at", "desc").orderBy("i.id", "desc");
  const date = (value: string | Date) => todayISO(undefined, new Date(value));
  const invoices: CoachInvoice[] = rows.map((row) => {
    const snapshot = row.package_snapshot ? snapshotOf(row.package_snapshot) : null;
    const current = Number(row.current_invoice_id) === Number(row.id);
    return { id: Number(row.id), clientId: Number(row.client_id), client: row.name, email: row.email,
      number: row.number, packageName: snapshot?.name || row.service_name || "—", interval: snapshot?.interval || row.service_interval || "unknown",
      cents: amountInCents(row.amount), currency: row.currency, status: snapshot && !current && ["unpaid", "overdue"].includes(row.status) ? "replaced" : row.status,
      created: date(row.created_at), due: date(row.due_on), paidAt: row.paid_at ? date(row.paid_at) : null,
      accessUntil: row.access_until ? date(row.access_until) : null, providerReference: row.provider_sid || null,
      assignment: snapshot ? { current, state: assignmentState(current, row.status === "paid", hasPaidAccess(row), row.client_status === "active" && Boolean(row.is_active) && row.approval_status === "approved"), viewedAt: row.client_viewed_at ? new Date(row.client_viewed_at).toISOString() : null } : undefined };
  });
  if (assignments) return <CoachAssignmentsWorkspace invoices={invoices.filter((row) => row.assignment)} />;
  return <CoachPaymentsWorkspace invoices={invoices} today={todayISO()} />;
}
