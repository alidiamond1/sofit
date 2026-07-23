import { notFound, redirect } from "next/navigation";
import { IntakeForm } from "@/components/onboarding/intake-form";
import { getInviteByToken } from "@/lib/onboarding/invites";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite || !["sent", "opened", "submitted"].includes(invite.status)) notFound();
  if (invite.status === "submitted") redirect(`/join/${token}/account`);
  return <IntakeForm token={token} email={invite.email} />;
}

