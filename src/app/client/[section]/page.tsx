import { notFound } from "next/navigation";
import { RealClientSection, realClientSections } from "@/components/dashboard/real-client-section";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ order_id?: string | string[] }>;
}) {
  const { section } = await params;
  if (!realClientSections.includes(section)) notFound();
  const query = await searchParams;
  return <RealClientSection section={section} orderId={typeof query.order_id === "string" ? query.order_id : undefined} />;
}
