import { NextResponse } from "next/server";

import { getInvestigation } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const investigation = getInvestigation(id);
  if (!investigation) {
    return NextResponse.json(
      { detail: "Investigation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json(investigation);
}