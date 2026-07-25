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
import { database } from "@/lib/db";
import { InviteForm } from "./invite-form";
import { Avatar, Badge, Card, PageHeader } from "@/components/dashboard/primitives";

const inviteSteps = [
  { title: "Private invite", description: "Create one secure link for the client's email.", icon: Link2 },
  { title: "Intake form", description: "The client shares goals, health and training details.", icon: ClipboardCheck },
  { title: "Account setup", description: "They create a password after completing the intake.", icon: KeyRound },
  { title: "Coach review", description: "Review the application and choose the right service.", icon: UserRoundCheck },
  { title: "Portal access", description: "Approval opens only the client's own dashboard.", icon: ShieldCheck },
] as const;

export async function CoachInvites() {
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
        eyebrow="Private onboarding"
        title="Invites & applications"
        description="A controlled path from private invitation to approved client access. You make the final decision."
        actions={<Badge tone={applications.length ? "warning" : "success"}>{applications.length ? `${applications.length} awaiting review` : "Review queue clear"}</Badge>}
      />

      <section className="invite-process card" aria-labelledby="invite-process-title">
        <div className="invite-process-heading">
          <div><span className="eyebrow">How it works</span><h2 id="invite-process-title">Client onboarding flow</h2></div>
          <p>Signup stays hidden until a client receives your private link.</p>
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
          <div className="invite-summary-heading"><span className="eyebrow">Live queue</span><h2>Onboarding status</h2><p>What needs your attention right now.</p></div>
          <div className="invite-summary-metrics">
            <div><span className="summary-icon blue"><Mail size={17} /></span><p><strong>{outstanding.length}</strong><small>Invites in progress</small></p></div>
            <div><span className="summary-icon amber"><UsersRound size={17} /></span><p><strong>{applications.length}</strong><small>Applications to review</small></p></div>
            <div><span className="summary-icon green"><CheckCircle2 size={17} /></span><p><strong>{accountReady}</strong><small>Accounts ready to approve</small></p></div>
          </div>
        </Card>
      </div>

      <div className="section-row invite-section-row">
        <div><span className="eyebrow">Decision queue</span><h2>Applications ready for review</h2><p>Open an application to check the intake and approve or decline access.</p></div>
        <Badge tone={applications.length ? "warning" : "neutral"}>{applications.length} pending</Badge>
      </div>
      <div className="application-grid invite-application-grid">
        {applications.map((application, index) => {
          const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers;
          const name = application.name || answers?.full_name || application.email;
          const summary = String(answers?.goals || answers?.meal_plan_motivation || "The intake form is complete and ready for your review.").slice(0, 170);
          return (
            <Card className="application-card invite-application-card" key={application.id}>
              <div className="application-head">
                <Avatar name={name} tone={index} />
                <p><strong>{name}</strong><span>{application.email}</span></p>
                <Badge tone="warning">Needs review</Badge>
              </div>
              <div className="application-progress" aria-label="Application progress">
                <span className="done"><CheckCircle2 size={14} /> Intake</span>
                <i />
                <span className={application.user_id ? "done" : "waiting"}>{application.user_id ? <CheckCircle2 size={14} /> : <Clock3 size={14} />} Account</span>
                <i />
                <span className="waiting"><Clock3 size={14} /> Decision</span>
              </div>
              <p className="application-summary">{summary}</p>
              <div className="application-card-foot">
                <span>{application.submitted_at ? `Submitted ${new Date(application.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Recently submitted"}</span>
                <Link className="button secondary small" href={`/coach/invites/${application.id}`}>Review application <ArrowRight size={15} /></Link>
              </div>
            </Card>
          );
        })}
        {applications.length === 0 ? (
          <Card className="empty-state invite-empty-state">
            <UserRoundCheck size={24} /><h3>No applications waiting</h3><p>Completed client applications will appear here automatically.</p>
          </Card>
        ) : null}
      </div>

      <div className="section-row invite-section-row">
        <div><span className="eyebrow">Invitation activity</span><h2>Outstanding invites</h2><p>Links that have been sent but have not reached review yet.</p></div>
        <Badge>{outstanding.length} open</Badge>
      </div>
      <Card className="outstanding-invites">
        <div className="outstanding-head" aria-hidden="true"><span>Client email</span><span>Progress</span><span>Sent</span><span>Expires</span></div>
        {outstanding.map((invite) => (
          <div className="outstanding-row" key={invite.id}>
            <span className="summary-icon blue"><Mail size={16} /></span>
            <div className="outstanding-email"><strong>{invite.email}</strong><span>Private intake link</span></div>
            <div className="outstanding-status"><Badge tone={invite.status === "opened" ? "success" : "blue"}>{invite.status === "opened" ? "Link opened" : "Invite sent"}</Badge></div>
            <div data-label="Sent"><strong>{new Date(invite.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong></div>
            <div data-label="Expires"><strong>{new Date(invite.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong><Clock3 size={14} /></div>
          </div>
        ))}
        {outstanding.length === 0 ? <div className="outstanding-empty"><CheckCircle2 size={18} /><span>No outstanding invitations.</span></div> : null}
      </Card>
    </>
  );
}
