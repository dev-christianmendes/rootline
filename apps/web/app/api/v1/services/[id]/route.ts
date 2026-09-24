import { NextResponse } from "next/server";

import { getService } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const service = getService(id);
  if (!service) {
    return NextResponse.json({ detail: "Service not found" }, { status: 404 });
  }
  return NextResponse.json(service);
}