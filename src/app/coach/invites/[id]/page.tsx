import { ApplicationReview } from "@/components/onboarding/application-review";

export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationReview inviteId={Number(id)} />;
}

