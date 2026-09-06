import { notFound } from "next/navigation";
import { CoachInvites } from "@/components/onboarding/coach-invites";
import { RealCoachSection, realCoachSections } from "@/components/dashboard/real-coach-section";

export default async function CoachPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ client?: string | string[]; transformation?: string | string[] }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (!realCoachSections.includes(section)) notFound();
  if (section === "invites") return <CoachInvites />;
  const clientValue = Array.isArray(query.client) ? query.client[0] : query.client;
  const selectedClientId = clientValue && /^\d+$/.test(clientValue) ? Number(clientValue) : null;
  const transformationValue = Array.isArray(query.transformation) ? query.transformation[0] : query.transformation;
  const selectedTransformationId = transformationValue && /^\d+$/.test(transformationValue) ? Number(transformationValue) : null;
  return <RealCoachSection section={section} selectedClientId={selectedClientId} selectedTransformationId={selectedTransformationId} />;
}
