import type { Metadata } from "next";

import { IncidentCenter } from "@/components/incidents/incident-center";

export const metadata: Metadata = { title: "Incidents" };

export default function IncidentsPage() {
  return <IncidentCenter />;
}