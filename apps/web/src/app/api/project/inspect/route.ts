import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectPath = body.path;

    if (!projectPath || typeof projectPath !== "string" || !projectPath.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid project directory path." },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/agent/inspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({ path: projectPath.trim() }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || `Inspection failed (HTTP ${res.status})` },
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
