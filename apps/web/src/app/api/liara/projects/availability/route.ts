import { NextRequest, NextResponse } from "next/server";
import { getActiveLiaraCredentials, getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") || "").trim();
  if (!/^[a-z0-9-]{3,64}$/i.test(name)) {
    return NextResponse.json({ ok: false, available: false, reason: "invalid_name" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    if (!user.authenticated) {
      return NextResponse.json({ ok: false, available: false, reason: "unauthenticated" }, { status: 401 });
    }

    const { token, teamId } = await getActiveLiaraCredentials();
    if (!token) {
      return NextResponse.json({ ok: false, available: false, reason: "missing_credentials" }, { status: 400 });
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";
    const res = await fetch(`${engineUrl}/liara/projects/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({ name, api_token: token, team_id: teamId || undefined }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, available: false, reason: data.reason || "provider_error" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, available: false, reason: "provider_error" }, { status: 502 });
  }
}
