import { NextResponse } from "next/server";
import { getExpectedDemoCredentials } from "@/lib/session";

export async function GET() {
  const credentials = getExpectedDemoCredentials();
  if (!credentials) return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ available: true, ...credentials }, { headers: { "Cache-Control": "no-store" } });
}
