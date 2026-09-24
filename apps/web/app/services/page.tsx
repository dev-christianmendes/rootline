import type { Metadata } from "next";

import { ServiceMap } from "@/components/service-map/service-map";
import { PageHeader } from "@/components/common/states";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Service map"
        description="Dependency graph between services. Click a node to inspect a service."
      />
      <ServiceMap />
    </div>
  );
}