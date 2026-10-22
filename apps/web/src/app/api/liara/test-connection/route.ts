import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    let token = typeof body.api_token === "string" ? body.api_token.trim() : "";
    let teamId = typeof body.team_id === "string" ? body.team_id.trim() : "";

    // If token or teamId not provided in body, fetch saved user configuration
    let dbUser = null;
    if (user.authenticated && user.username) {
      dbUser = await prisma.user.findUnique({
        where: { username: user.username },
      });
    }

    if (!token) {
      if (dbUser?.liaraToken) {
        token = dbUser.liaraToken;
      }
      if (!token) {
        token = process.env.LIARA_API_TOKEN || "";
      }
    }

    if (!teamId) {
      if (dbUser?.liaraTeamId) {
        teamId = dbUser.liaraTeamId;
      }
      if (!teamId) {
        teamId = process.env.LIARA_TEAM_ID || "";
      }
    }

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "No Liara API token configured. Please enter your token in Settings." },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/liara/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        api_token: token.trim(),
        team_id: teamId.trim() || undefined,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Engine returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to connect to Python engine: ${message}` },
      { status: 500 }
    );
  }
}
