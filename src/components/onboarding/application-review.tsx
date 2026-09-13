import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { rejectApplicationAction } from "@/app/actions/onboarding";
import { ApprovalForm } from "./approval-form";
import { statusLabel } from "@/lib/status-labels";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { database } from "@/lib/db";
import { intakeSections } from "@/lib/onboarding/intake-fields";

export async function ApplicationReview({ inviteId }: { inviteId: number }) {
  const t = await getTranslations("Invites");
  const ts = await getTranslations("Common.status");
  const [application, packages] = await Promise.all([
    database()("invites")
      .select("invites.*", "users.name", "users.email as user_email", "clients.package_id as current_package_id")
      .leftJoin("users", "users.id", "invites.user_id")
      .leftJoin("clients", "clients.user_id", "invites.user_id")
      .where("invites.id", inviteId)
      .first(),
    database()("packages").select("id", "name", "price", "billing_interval").where({ is_active: true }).orderBy("name"),
  ]);
  if (!application) notFound();
  const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers;
  const applicationName = application.name || answers?.full_name || application.email;
  const applicationEmail = application.user_email || application.email;
  const accountReady = Boolean(application.user_id);
  const alreadyApproved = application.status === "approved";

  return (
    <>
      <Link href="/coach/invites" className="button secondary review-back"><ArrowLeft size={15} /> {t("backToApplications")}</Link>
      <PageHeader eyebrow={t("applicationReview")} title={applicationName} description={applicationEmail} actions={<Badge tone={application.status === "approved" ? "success" : "warning"}>{statusLabel(ts, application.status)}</Badge>} />
      <div className="application-review-grid">
        <div className="application-answers">
          {intakeSections.map((section) => <Card key={section.id}><div className="card-head"><div><span className="eyebrow">{section.subtitle}</span><h2>{section.title}</h2></div></div><dl>{section.fields.map((field) => <div key={field.name}><dt>{field.label}</dt><dd>{answers?.[field.name] || "?"}</dd></div>)}</dl></Card>)}
        </div>
        <aside>
          <Card className="approval-card"><span className="eyebrow">{t("coachDecision")}</span><h2>{t("reviewAndDecide")}</h2><p>{alreadyApproved ? t("alreadyApprovedHint") : accountReady ? t("accountReadyHint") : t("notReadyHint")}</p>
            <ApprovalForm inviteId={Number(application.id)} currentPackageId={application.current_package_id ? Number(application.current_package_id) : null} accountReady={accountReady} alreadyApproved={alreadyApproved} packages={packages.map((pkg) => ({ id: Number(pkg.id), name: String(pkg.name), price: Number(pkg.price), billingInterval: String(pkg.billing_interval) }))} />
            <div className="decision-divider"><span>{t("or")}</span></div>
            <form action={rejectApplicationAction}><input type="hidden" name="invite_id" value={application.id} /><label><span>{t("reasonLabel")}</span><textarea name="review_notes" rows={3} /></label><button className="button danger full" disabled={application.status !== "submitted"}><X size={15} /> {t("declineApplication")}</button></form>
          </Card>
        </aside>
      </div>
    </>
  );
}

