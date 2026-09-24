import { NextResponse } from "next/server";

import { getServices } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getServices());
}