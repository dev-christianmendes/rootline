import { NextResponse } from "next/server";

import { getIncident, getLogs } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const incident = getIncident(id);
  if (!incident) {
    return NextResponse.json({ detail: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json(getLogs(id, incident.serviceId));
}