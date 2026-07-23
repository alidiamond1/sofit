import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveApplicationAction, rejectApplicationAction } from "@/app/actions/onboarding";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { database } from "@/lib/db";
import { intakeSections } from "@/lib/onboarding/intake-fields";

export async function ApplicationReview({ inviteId }: { inviteId: number }) {
  const [application, services] = await Promise.all([
    database()("invites")
      .select("invites.*", "users.name", "users.email as user_email")
      .leftJoin("users", "users.id", "invites.user_id")
      .where("invites.id", inviteId)
      .first(),
    database()("services").select("id", "name", "price", "billing_interval").where({ is_active: true }).orderBy("type"),
  ]);
  if (!application) notFound();
  const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers;
  const applicationName = application.name || answers?.full_name || application.email;
  const applicationEmail = application.user_email || application.email;
  const accountReady = Boolean(application.user_id);

  return (
    <>
      <Link href="/coach/invites" className="button secondary review-back"><ArrowLeft size={15} /> Back to applications</Link>
      <PageHeader eyebrow="Application review" title={applicationName} description={applicationEmail} actions={<Badge tone={application.status === "approved" ? "success" : "warning"}>{application.status}</Badge>} />
      <div className="application-review-grid">
        <div className="application-answers">
          {intakeSections.map((section) => <Card key={section.id}><div className="card-head"><div><span className="eyebrow">{section.subtitle}</span><h2>{section.title}</h2></div></div><dl>{section.fields.map((field) => <div key={field.name}><dt>{field.label}</dt><dd>{answers?.[field.name] || "?"}</dd></div>)}</dl></Card>)}
        </div>
        <aside>
          <Card className="approval-card"><span className="eyebrow">Coach decision</span><h2>Review and decide</h2><p>{accountReady ? "The client account is ready. Approval unlocks the client dashboard." : "The intake is ready for review. Approval becomes available after the client creates their account."}</p>
            <form action={approveApplicationAction}><input type="hidden" name="invite_id" value={application.id} /><label><span>Service or PT tier</span><select name="service_id" defaultValue="" disabled={!accountReady}><option value="">Approve without a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} - ${Number(service.price).toFixed(0)} {service.billing_interval === "monthly" ? "/ month" : ""}</option>)}</select></label><button className="button primary full" disabled={application.status !== "submitted" || !accountReady}><Check size={15} /> {accountReady ? "Approve & open portal" : "Waiting for account signup"}</button></form>
            <div className="decision-divider"><span>or</span></div>
            <form action={rejectApplicationAction}><input type="hidden" name="invite_id" value={application.id} /><label><span>Reason or private review note</span><textarea name="review_notes" rows={3} /></label><button className="button danger full" disabled={application.status !== "submitted"}><X size={15} /> Decline application</button></form>
          </Card>
        </aside>
      </div>
    </>
  );
}

