import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEnvironmentApprovalValid } from "@/lib/env-preflight";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user.authenticated || !user.username) {
      return NextResponse.json({ ok: false, error: "برای ثبت متغیرها ابتدا وارد حساب شوید." }, { status: 401 });
    }
    if (req.headers.get("origin") !== req.nextUrl.origin) {
      return NextResponse.json({ ok: false, error: "درخواست تأییدشده از مبدأ معتبر ارسال نشده است." }, { status: 403 });
    }

    const dbUser = await prisma.user.findUnique({ where: { username: user.username } });
    const token = dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "";
    const teamId = dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || "";

    const body = await req.json().catch(() => ({}));
    const { appName, envVars, approval } = body;

    if (!appName) {
      return NextResponse.json(
        { ok: false, error: "نام سرویس لیارا لازم است." },
        { status: 400 }
      );
    }

    if (typeof appName !== "string" || !envVars || typeof envVars !== "object" || Array.isArray(envVars)
      || Object.entries(envVars).some(([name, value]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof value !== "string")) {
      return NextResponse.json({ ok: false, error: "نام سرویس یا مقادیر متغیرهای محیطی معتبر نیستند." }, { status: 400 });
    }
    if (!(await isEnvironmentApprovalValid(appName, envVars as Record<string, string>, approval))) {
      return NextResponse.json({ ok: false, error: "تأیید معتبر برای همین سرویس و مقادیر دریافت نشد." }, { status: 403 });
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "کلید دسترسی (API Token) لیارا تنظیم نشده است.",
        },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const res = await fetch(`${engineUrl}/agent/cloud/env/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        app_name: appName.trim(),
        env_vars: envVars || {},
        api_token: token.trim(),
        team_id: teamId.trim() || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || `Setting cloud env failed (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to set cloud env: ${message}` },
      { status: 500 }
    );
  }
}

