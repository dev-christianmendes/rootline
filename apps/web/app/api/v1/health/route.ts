import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    environment: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.floor(process.uptime()),
  });
}