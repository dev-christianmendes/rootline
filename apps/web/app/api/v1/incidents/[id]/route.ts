import { NextResponse } from "next/server";

import type { Incident } from "@rootline/types";

import { getIncident, patchIncident } from "@/lib/mock";

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
  return NextResponse.json(incident);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<Incident>;

  const incident = patchIncident(id, body);
  if (!incident) {
    return NextResponse.json({ detail: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json(incident);
}