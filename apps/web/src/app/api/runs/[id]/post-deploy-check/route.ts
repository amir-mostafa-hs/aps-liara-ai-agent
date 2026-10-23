import { NextResponse } from "next/server";
import { getCurrentUser, resolveLiaraCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentUser();
  if (!session.authenticated || !session.username) {
    return NextResponse.json({ ok: false, error: "برای بررسی دپلوی وارد حساب شوید." }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { username: session.username } });
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ ok: false, error: "اجرای موردنظر پیدا نشد." }, { status: 404 });
  if (!user || run.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "اجازهٔ دسترسی به این اجرا را ندارید." }, { status: 403 });
  }

  const activeCredentials = resolveLiaraCredentials(session.username, user);
  const token = activeCredentials.token;
  if (!token.trim()) {
    return NextResponse.json({ ok: false, error: "توکن Liara برای بررسی وضعیت و لاگ لازم است." }, { status: 400 });
  }

  try {
    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret = process.env.INTERNAL_AGENT_SECRET;
    if (!internalSecret) {
      return NextResponse.json({ ok: false, error: "اتصال امن موتور Agent پیکربندی نشده است." }, { status: 503 });
    }
    const response = await fetch(`${engineUrl}/agent/post-deploy-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
      body: JSON.stringify({
        app_id: run.targetApp,
        api_token: token,
        team_id: run.teamId || activeCredentials.teamId || undefined,
        provider_deployment_state: "succeeded",
        max_wait_seconds: 180,
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.result) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || "بررسی وضعیت پس از دپلوی کامل نشد." },
        { status: response.status || 502 },
      );
    }

    const result = data.result;
    const status = result.outcome === "healthy" ? "succeeded" : result.outcome === "unhealthy" ? "failed" : "inconclusive";
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        status,
        providerStatus: result.provider_deployment_state,
        verification: {
          provider_deployment_state: result.provider_deployment_state,
          provider_release_state: result.provider_release_state,
          provider_release_warning: result.provider_release_warning,
          application_health: result.application_health,
          endpoint_url: result.endpoint_url,
          http_status_code: result.http_status_code,
          runtime_logs_status: result.runtime_logs_status,
          runtime_logs_warning: result.runtime_logs_warning,
          attempts: result.attempts,
          elapsed_seconds: result.elapsed_seconds,
        },
        redactedLogs: result.runtime_logs || run.redactedLogs,
        remediationPlan: result.diagnosis || undefined,
        finishedAt: status === "succeeded" ? new Date() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        actor: session.username,
        action: "post_deploy_checked",
        metadata: {
          provider_deployment_state: result.provider_deployment_state,
          provider_release_state: result.provider_release_state,
          application_health: result.application_health,
          http_status_code: result.http_status_code,
          runtime_logs_status: result.runtime_logs_status,
          attempts: result.attempts,
          outcome: result.outcome,
        },
      },
    });

    return NextResponse.json({ ok: true, run: updatedRun, result });
  } catch {
    return NextResponse.json({ ok: false, error: "ارتباط با موتور Agent برای بررسی نهایی برقرار نشد." }, { status: 502 });
  }
}
