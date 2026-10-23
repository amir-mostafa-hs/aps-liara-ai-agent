import { NextResponse } from "next/server";
import { getActiveLiaraCredentials, getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user.authenticated) {
      return NextResponse.json({ ok: false, error: "برای مشاهده پلن‌ها ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    }

    const { token, teamId } = await getActiveLiaraCredentials();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "برای دریافت پلن‌های معتبر، ابتدا توکن لیارا را در تنظیمات وارد کنید." },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";
    const response = await fetch(`${engineUrl}/liara/app-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
      body: JSON.stringify({ api_token: token, team_id: teamId || undefined }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "پلن‌های معتبر از لیارا دریافت نشدند." }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { ok: false, error: "ارتباط با لیارا برقرار نشد. لطفاً اتصال را بررسی و دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
