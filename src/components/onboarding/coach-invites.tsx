import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  KeyRound,
  Link2,
  Mail,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { database } from "@/lib/db";
import { InviteForm } from "./invite-form";
import { Avatar, Badge, Card, PageHeader } from "@/components/dashboard/primitives";

const inviteStepIcons = [Link2, ClipboardCheck, KeyRound, UserRoundCheck, ShieldCheck] as const;
const inviteStepKeys = ["step1", "step2", "step3", "step4", "step5"] as const;

export async function CoachInvites() {
  const t = await getTranslations("Invites");
  const inviteSteps = inviteStepKeys.map((key, index) => ({
    title: t(`${key}Title`),
    description: t(`${key}Desc`),
    icon: inviteStepIcons[index],
  }));
  const [applications, outstanding] = await Promise.all([
    database()("invites")
      .select("invites.id", "invites.email", "invites.submitted_at", "invites.intake_answers", "invites.user_id", "users.name")
      .leftJoin("users", "users.id", "invites.user_id")
      .where("invites.status", "submitted")
      .orderBy("invites.submitted_at", "desc"),
    database()("invites")
      .select("id", "email", "status", "created_at", "expires_at")
      .whereIn("status", ["sent", "opened"])
      .orderBy("created_at", "desc"),
  ]);

  const accountReady = applications.filter((application) => Boolean(application.user_id)).length;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<Badge tone={applications.length ? "warning" : "success"}>{applications.length ? t("awaitingReview", { count: applications.length }) : t("reviewQueueClear")}</Badge>}
      />

      <section className="invite-process card" aria-labelledby="invite-process-title">
        <div className="invite-process-heading">
          <div><span className="eyebrow">{t("howItWorks")}</span><h2 id="invite-process-title">{t("onboardingFlow")}</h2></div>
          <p>{t("signupHiddenHint")}</p>
        </div>
        <ol className="invite-process-steps">
          {inviteSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <span className="invite-step-number">{index + 1}</span>
                <span className="invite-step-icon"><Icon size={18} /></span>
                <div><strong>{step.title}</strong><p>{step.description}</p></div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="invite-command-grid">
        <InviteForm />
        <Card className="invite-queue-summary">
          <div className="invite-summary-heading"><span className="eyebrow">{t("liveQueue")}</span><h2>{t("onboardingStatus")}</h2><p>{t("needsAttentionHint")}</p></div>
          <div className="invite-summary-metrics">
            <div><span className="summary-icon blue"><Mail size={17} /></span><p><strong>{outstanding.length}</strong><small>{t("invitesInProgress")}</small></p></div>
            <div><span className="summary-icon amber"><UsersRound size={17} /></span><p><strong>{applications.length}</strong><small>{t("applicationsToReview")}</small></p></div>
            <div><span className="summary-icon green"><CheckCircle2 size={17} /></span><p><strong>{accountReady}</strong><small>{t("accountsReadyToApprove")}</small></p></div>
          </div>
        </Card>
      </div>

      <div className="section-row invite-section-row">
        <div><span className="eyebrow">{t("decisionQueue")}</span><h2>{t("applicationsReadyForReview")}</h2><p>{t("openApplicationHint")}</p></div>
        <Badge tone={applications.length ? "warning" : "neutral"}>{t("pendingCount", { count: applications.length })}</Badge>
      </div>
      <div className="application-grid invite-application-grid">
        {applications.map((application, index) => {
          const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers;
          const name = application.name || answers?.full_name || application.email;
          const summary = String(answers?.goals || answers?.meal_plan_motivation || t("defaultSummary")).slice(0, 170);
          return (
            <Card className="application-card invite-application-card" key={application.id}>
              <div className="application-head">
                <Avatar name={name} tone={index} />
                <p><strong>{name}</strong><span>{application.email}</span></p>
                <Badge tone="warning">{t("needsReview")}</Badge>
              </div>
              <div className="application-progress" aria-label="Application progress">
                <span className="done"><CheckCircle2 size={14} /> {t("progressIntake")}</span>
                <i />
                <span className={application.user_id ? "done" : "waiting"}>{application.user_id ? <CheckCircle2 size={14} /> : <Clock3 size={14} />} {t("progressAccount")}</span>
                <i />
                <span className="waiting"><Clock3 size={14} /> {t("progressDecision")}</span>
              </div>
              <p className="application-summary">{summary}</p>
              <div className="application-card-foot">
                <span>{application.submitted_at ? t("submittedOn", { date: new Date(application.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }) : t("recentlySubmitted")}</span>
                <Link className="button secondary small" href={`/coach/invites/${application.id}`}>{t("reviewApplication")} <ArrowRight size={15} /></Link>
              </div>
            </Card>
          );
        })}
        {applications.length === 0 ? (
          <Card className="empty-state invite-empty-state">
            <UserRoundCheck size={24} /><h3>{t("noApplicationsTitle")}</h3><p>{t("noApplicationsHint")}</p>
          </Card>
        ) : null}
      </div>

      <div className="section-row invite-section-row">
        <div><span className="eyebrow">{t("invitationActivity")}</span><h2>{t("outstandingInvites")}</h2><p>{t("outstandingHint")}</p></div>
        <Badge>{t("openCount", { count: outstanding.length })}</Badge>
      </div>
      <Card className="outstanding-invites">
        <div className="outstanding-head" aria-hidden="true"><span>{t("colClientEmail")}</span><span>{t("colProgress")}</span><span>{t("colSent")}</span><span>{t("colExpires")}</span></div>
        {outstanding.map((invite) => (
          <div className="outstanding-row" key={invite.id}>
            <span className="summary-icon blue"><Mail size={16} /></span>
            <div className="outstanding-email"><strong>{invite.email}</strong><span>{t("privateIntakeLink")}</span></div>
            <div className="outstanding-status"><Badge tone={invite.status === "opened" ? "success" : "blue"}>{invite.status === "opened" ? t("linkOpened") : t("inviteSent")}</Badge></div>
            <div data-label="Sent"><strong>{new Date(invite.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong></div>
            <div data-label="Expires"><strong>{new Date(invite.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong><Clock3 size={14} /></div>
          </div>
        ))}
        {outstanding.length === 0 ? <div className="outstanding-empty"><CheckCircle2 size={18} /><span>{t("noOutstandingInvites")}</span></div> : null}
      </Card>
    </>
  );
}
