import { ArrowRight, Clock3, Mail, UserCheck } from "lucide-react";
import Link from "next/link";
import { database } from "@/lib/db";
import { InviteForm } from "./invite-form";
import { Avatar, Badge, Card, PageHeader } from "@/components/dashboard/primitives";

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

  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Invites & applications" description="Create a private link, then review the completed intake and account before granting portal access." />
      <InviteForm />
      <div className="section-row"><div><span className="eyebrow">Awaiting review</span><h2>Completed applications</h2></div><Badge tone="warning">{applications.length} pending</Badge></div>
      <div className="application-grid">
        {applications.map((application, index) => {
          const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers;
          const name = application.name || answers?.full_name || application.email;
          return <Card className="application-card" key={application.id}><div className="application-head"><Avatar name={name} tone={index} /><p><strong>{name}</strong><span>{application.email}</span></p><Badge tone="warning">Review</Badge></div><div className="tag-row"><Badge tone="success">Intake submitted</Badge><Badge>{answers?.goals ? "Goals added" : "Form complete"}</Badge><Badge tone={application.user_id ? "success" : "warning"}>{application.user_id ? "Account created" : "Awaiting signup"}</Badge></div><p>{String(answers?.goals || answers?.meal_plan_motivation || "").slice(0, 150)}</p><Link className="button secondary full" href={`/coach/invites/${application.id}`}>Review application <ArrowRight size={15} /></Link></Card>;
        })}
        {applications.length === 0 ? <Card className="empty-state"><UserCheck size={24} /><h3>No applications waiting</h3><p>An application appears here immediately after the invited client submits the intake form.</p></Card> : null}
      </div>
      <div className="section-row"><div><span className="eyebrow">Outstanding</span><h2>Sent invites</h2></div></div>
      <Card className="simple-rows">
        {outstanding.map((invite) => <div key={invite.id}><span className="task-icon mint"><Mail size={16} /></span><div><strong>{invite.email}</strong><span>Expires {new Date(invite.expires_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span></div><Badge tone={invite.status === "opened" ? "success" : "neutral"}>{invite.status}</Badge><Clock3 size={15} /></div>)}
        {outstanding.length === 0 ? <div><span>No outstanding invites.</span></div> : null}
      </Card>
    </>
  );
}

