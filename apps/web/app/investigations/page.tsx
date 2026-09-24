import type { Metadata } from "next";

import { InvestigationsCenter } from "@/components/investigation/investigations-center";
import { PageHeader } from "@/components/common/states";

export const metadata: Metadata = { title: "Investigations" };

export default function InvestigationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        description="Active and past AI-assisted investigations with hypotheses and evidence."
      />
      <InvestigationsCenter />
    </div>
  );
}