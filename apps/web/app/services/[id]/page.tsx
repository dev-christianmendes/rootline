import type { Metadata } from "next";

import { ServiceDetail } from "@/components/services/service-detail";

export const metadata: Metadata = { title: "Service details" };

export default async function ServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceDetail serviceId={id} />;
}