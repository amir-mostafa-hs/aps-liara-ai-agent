import { NextRequest, NextResponse } from "next/server";
import { getActiveLiaraCredentials, getCurrentUser } from "@/lib/auth";
import { matchesApprovedAppCreation } from "@/lib/app-creation-approval";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user.authenticated) {
      return NextResponse.json({ ok: false, error: "برای ساخت سرویس ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    }

    const { token, teamId } = await getActiveLiaraCredentials();

    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId || body.project_id;
    const platform = body.platform;
    const planId = body.planId || body.plan_id;

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json(
        { ok: false, error: "نام یا شناسه اپلیکیشن الزامی است." },
        { status: 400 }
      );
    }

    if (typeof platform !== "string" || !platform.trim() || typeof planId !== "string" || !planId.trim()) {
      return NextResponse.json(
        { ok: false, error: "پلتفرم و پلن تأییدشده برای ساخت سرویس الزامی است." },
        { status: 400 }
      );
    }

    const approvedTeamId = typeof body.teamId === "string" ? body.teamId.trim() : null;
    const activeTeamId = teamId?.trim() || null;
    const action = {
      appName: projectId.trim(),
      platform: platform.trim(),
      planId: planId.trim(),
      teamId: approvedTeamId,
      priceMonthly: typeof body.priceMonthly === "number" ? body.priceMonthly : null,
    };
    if (approvedTeamId !== activeTeamId || !matchesApprovedAppCreation(body.approval, action)) {
      return NextResponse.json(
        { ok: false, error: "مقادیر تأییدشده با نام، پلتفرم، پلن، هزینه یا تیم فعال یکسان نیستند. لطفاً اطلاعات را دوباره بررسی و تأیید کنید." },
        { status: approvedTeamId !== activeTeamId ? 409 : 403 }
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
        approved: true,
        api_token: token.trim(),
        team_id: teamId.trim() || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, reason: data.reason || data.detail?.reason, error: typeof data.detail === "string" ? data.detail : data.detail?.message || data.error || `Project creation failed (HTTP ${res.status})` },
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

