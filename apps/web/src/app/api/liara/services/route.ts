import { NextRequest, NextResponse } from "next/server";
import { getActiveLiaraCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { token, teamId } = await getActiveLiaraCredentials();

    if (!token || token.trim().length === 0) {
      return NextResponse.json({
        ok: false,
        error: "کلید دسترسی (API Token) لیارا تنظیم نشده است. لطفاً توکن خود را در تنظیمات وارد کنید.",
        services: [],
        count: 0,
      });
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const params = new URLSearchParams();
    if (teamId && teamId.trim()) {
      params.set("team_id", teamId.trim());
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";
    const res = await fetch(`${engineUrl}/liara/services${query}`, {
      method: "GET",
      headers: {
        "X-Internal-Secret": internalSecret,
        "X-Liara-Token": token.trim(),
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error || data.detail || `خطا در دریافت لیست سرویس‌ها از لیارا (کد ${res.status})`,
          services: [],
          count: 0,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      services: data.services || [],
      count: (data.services || []).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `خطا در برقراری ارتباط با موتور ایجنت: ${message}`, services: [], count: 0 },
      { status: 500 }
    );
  }
}
