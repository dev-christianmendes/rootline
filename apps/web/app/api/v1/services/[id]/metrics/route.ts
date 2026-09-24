import { NextResponse } from "next/server";

import { getMetrics, getService } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const service = getService(id);
  if (!service) {
    return NextResponse.json({ detail: "Service not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const metric = url.searchParams.get("metric") ?? undefined;

  return NextResponse.json(getMetrics(id, metric));
}