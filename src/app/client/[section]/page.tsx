import { notFound } from "next/navigation";
import { RealClientSection, realClientSections } from "@/components/dashboard/real-client-section";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!realClientSections.includes(section)) notFound();
  return <RealClientSection section={section} />;
}
