import { NextRequest, NextResponse } from "next/server";
import { getActiveLiaraCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, teamId } = await getActiveLiaraCredentials();

    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId || body.project_id;
    const platform = body.platform || "node";
    const planId = body.planId || body.plan_id || "ir-standard-1";

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json(
        { ok: false, error: "نام یا شناسه اپلیکیشن الزامی است." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "کلید دسترسی (API Token) لیارا تنظیم نشده است. لطفاً ابتدا توکن خود را در چت یا تنظیمات وارد کنید.",
        },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/liara/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        project_id: projectId.trim(),
        platform: platform.trim(),
        plan_id: planId.trim(),
        api_token: token.trim(),
        team_id: teamId.trim() || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || `Project creation failed (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to create project: ${message}` },
      { status: 500 }
    );
  }
}

