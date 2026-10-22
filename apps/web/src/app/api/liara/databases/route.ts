import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let token = process.env.LIARA_API_TOKEN || "";
    let teamId = process.env.LIARA_TEAM_ID || "";

    if (user.authenticated && user.username) {
      const dbUser = await prisma.user.findUnique({
        where: { username: user.username },
      });
      if (dbUser?.liaraToken) {
        token = dbUser.liaraToken;
      }
      if (dbUser?.liaraTeamId) {
        teamId = dbUser.liaraTeamId;
      }
    }

    const body = await req.json().catch(() => ({}));
    const { dbName, dbType, planId } = body;

    if (!dbName || !dbType || !planId) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters: dbName, dbType, and planId are required." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "کلید دسترسی (API Token) لیارا تنظیم نشده است. لطفاً ابتدا توکن خود را در چت وارد کنید.",
        },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/agent/database/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        db_name: dbName.trim(),
        db_type: dbType.trim(),
        plan_id: planId.trim(),
        api_token: token.trim(),
        team_id: teamId.trim() || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || `Database creation failed (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to create database: ${message}` },
      { status: 500 }
    );
  }
}

