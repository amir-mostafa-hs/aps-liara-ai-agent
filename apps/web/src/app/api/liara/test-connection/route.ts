import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    let token = body.api_token;

    // If token not provided in body, fetch saved token
    if (!token) {
      if (user.authenticated && user.username) {
        const dbUser = await prisma.user.findUnique({
          where: { username: user.username },
        });
        if (dbUser?.liaraToken) {
          token = dbUser.liaraToken;
        }
      }
      if (!token) {
        token = process.env.LIARA_API_TOKEN || "";
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
      body: JSON.stringify({ api_token: token }),
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
