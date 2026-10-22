import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sourcePath, appName, platform, port, startCommand, envVars } = body;

    if (!sourcePath || !appName) {
      return NextResponse.json(
        { ok: false, error: "sourcePath and appName are required." },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/agent/config/diff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        source_path: sourcePath.trim(),
        app_name: appName.trim(),
        platform: platform || "nodejs",
        port: port || 3000,
        start_command: startCommand || undefined,
        env_vars: envVars || {},
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || `Diff generation failed (HTTP ${res.status})` },
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

