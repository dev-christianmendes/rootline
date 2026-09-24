import type { Metadata } from "next";

import { InvestigationWorkspace } from "@/components/investigation/investigation-workspace";

export const metadata: Metadata = { title: "Investigation workspace" };

export default async function InvestigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvestigationWorkspace investigationId={id} />;
}