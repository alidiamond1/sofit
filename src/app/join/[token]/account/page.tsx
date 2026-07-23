import { notFound, redirect } from "next/navigation";
import { AccountForm } from "@/components/onboarding/account-form";
import { getInviteByToken } from "@/lib/onboarding/invites";

export default async function InvitedAccountPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite || invite.status !== "submitted" || !invite.intake_answers) notFound();
  if (invite.user_id) redirect("/application-pending");
  const answers = typeof invite.intake_answers === "string" ? JSON.parse(invite.intake_answers) : invite.intake_answers;
  return <AccountForm token={token} email={invite.email} name={String(answers.full_name || "there")} />;
}

