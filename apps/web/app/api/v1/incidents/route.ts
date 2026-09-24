import { NextResponse } from "next/server";

import type { Incident } from "@rootline/types";

import { createIncident, getIncidents } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getIncidents());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<Incident>;
  if (!body.title) {
    return NextResponse.json(
      { detail: "Field 'title' is required" },
      { status: 400 },
    );
  }
  const incident = createIncident(body);
  return NextResponse.json(incident, { status: 201 });
}