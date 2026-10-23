import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ ok: false, error: "برای دریافت لاگ‌ها ابتدا وارد حساب شوید." }, { status: 401 });
  }

  const { id } = await params;
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ ok: false, error: "اجرای موردنظر پیدا نشد." }, { status: 404 });

  try {
    const dbUser = await prisma.user.findUnique({ where: { username: user.username } });
    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";
    const response = await fetch(`${engineUrl}/agent/runtime-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
      body: JSON.stringify({
        app_id: run.targetApp || "unknown",
        lines: 100,
        api_token: dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "",
        team_id: run.teamId || dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || undefined,
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      return NextResponse.json({ ok: false, log_source: "runtime", error: data.error || "دریافت لاگ‌های اجرا ممکن نشد." }, { status: response.status });
    }
    return NextResponse.json({ ok: true, log_source: "runtime", logs: data.logs, error: null });
  } catch {
    return NextResponse.json({ ok: false, log_source: "runtime", error: "ارتباط برای دریافت لاگ‌های اجرای سرویس برقرار نشد." }, { status: 502 });
  }
}
