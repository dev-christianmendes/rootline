import type { Metadata } from "next";

import { DeploymentTimeline } from "@/components/deployments/deployment-timeline";
import { PageHeader } from "@/components/common/states";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployment timeline"
        description="Recent changes across services, correlated with the incident window."
      />
      <DeploymentTimeline />
    </div>
  );
}