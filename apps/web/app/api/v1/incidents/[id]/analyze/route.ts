import { NextResponse } from "next/server";

import { analyzeIncident, getIncident } from "@/lib/mock";

export const runtime = "nodejs";

const ARTIFICIAL_DELAY_MS = 900;

/**
 * Mock AI analysis endpoint (spec §23, §11).
 * The correlation/analysis pipeline is currently simulated: hypotheses are
 * pre-computed datasets. The delay creates a realistic "investigating"
 * experience while the frontend is being validated.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const incident = getIncident(id);
  if (!incident) {
    return NextResponse.json({ detail: "Incident not found" }, { status: 404 });
  }

  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));

  const investigation = analyzeIncident(id);
  if (!investigation) {
    return NextResponse.json(
      { detail: "No analysis available for this incident" },
      { status: 404 },
    );
  }

  return NextResponse.json(investigation);
}