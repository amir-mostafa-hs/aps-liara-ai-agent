import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/liara/plans`, {
      method: "GET",
      headers: {
        "X-Internal-Secret": internalSecret,
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || `Failed to fetch plans (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to communicate with Agent Engine: ${message}` },
      { status: 500 }
    );
  }
}

