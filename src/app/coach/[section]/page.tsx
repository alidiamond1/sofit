import { notFound } from "next/navigation";
import { CoachInvites } from "@/components/onboarding/coach-invites";
import { RealCoachSection, realCoachSections } from "@/components/dashboard/real-coach-section";

export default async function CoachPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!realCoachSections.includes(section)) notFound();
  if (section === "invites") return <CoachInvites />;
  return <RealCoachSection section={section} />;
}
