import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canGenerateSecretForEnvName, createApprovedEnvRemediation, isRunOwnedByUser, remediationDigest, type ApprovedEnvRemediation } from "@/lib/remediation-approval";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ ok: false, error: "برای ادامه ابتدا وارد حساب شوید." }, { status: 401 });
  }
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "درخواست از مبدأ معتبر ارسال نشده است." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "شناسهٔ اجرای دپلوی لازم است." }, { status: 400 });
  }

  try {
    const run = await prisma.run.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: "اجرای موردنظر پیدا نشد." }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });
    if (!isRunOwnedByUser(run.userId, dbUser?.id)) {
      return NextResponse.json({ ok: false, error: "این اجرا متعلق به حساب کاربری شما نیست." }, { status: 403 });
    }

    const diagnosis = run.remediationPlan as any;
    if (!diagnosis || diagnosis.diagnosis_status === "inconclusive" || !diagnosis.missing_variable) {
      return NextResponse.json(
        { ok: false, error: "شواهد کافی برای ثبت یک متغیر مشخص وجود ندارد. ابتدا علت را با لاگ‌های سرویس بررسی کنید." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body.approved !== true || !["approve", "execute"].includes(body.phase)) {
      return NextResponse.json({ ok: false, error: "برای اعمال این تغییر، تأیید صریح شما لازم است." }, { status: 403 });
    }
    if (!run.targetApp || (typeof body.targetApp === "string" && body.targetApp !== run.targetApp)) {
      return NextResponse.json({ ok: false, error: "سرویس مقصد با سرویس همین اجرا مطابقت ندارد؛ هیچ تغییری اعمال نشد." }, { status: 400 });
    }

    let priorApproval: any = null;
    if (body.phase === "execute") {
      priorApproval = await prisma.actionApproval.findFirst({
        where: { id: body.approval_id, runId: run.id, userId: dbUser?.id, approved: true, operation: "set_env", target: run.targetApp },
      });
      if (!priorApproval) {
        return NextResponse.json({ ok: false, error: "تأیید معتبر یا استفاده‌نشده‌ای برای این راهکار پیدا نشد." }, { status: 403 });
      }
    }

    const valueSource = body.value_source === "generated" ? "generated" : "manual";
    let remediation: ApprovedEnvRemediation;
    try {
      remediation = createApprovedEnvRemediation({
        approved: body.approved,
        targetApp: run.targetApp,
        missingVariable: diagnosis.missing_variable,
        envValue: typeof body.env_value === "string" ? body.env_value : "",
        valueSource,
      }, priorApproval ? () => priorApproval.actionId : undefined);
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "مقادیر راهکار معتبر نیستند." }, { status: 400 });
    }
    if (valueSource === "generated" && !canGenerateSecretForEnvName(diagnosis.missing_variable)) {
      return NextResponse.json({ ok: false, error: "این متغیر باید از سرویس خارجی دریافت شود و امکان تولید خودکار آن وجود ندارد." }, { status: 400 });
    }

    if (remediation.operation !== "set_env" || remediation.target !== run.targetApp) {
      return NextResponse.json({ ok: false, error: "برای این علت، راهکار خودکار امنی در دسترس نیست." }, { status: 400 });
    }
    const planDigest = await remediationDigest(diagnosis.diagnosis_id || run.id, remediation);

    if (body.phase === "approve") {
      const approval = await prisma.actionApproval.create({
        data: {
          runId: run.id,
          userId: dbUser?.id,
          actionId: remediation.action_id,
          operation: "set_env",
          target: run.targetApp,
          approved: true,
          planDigest,
        },
      });
      return NextResponse.json({ ok: true, approvalId: approval.id, planDigest });
    }

    if (priorApproval.actionId !== remediation.action_id || priorApproval.planDigest !== planDigest) {
      return NextResponse.json({ ok: false, error: "مقادیر با راهکار تأییدشده تغییر کرده‌اند؛ لطفاً دوباره آن‌ها را بررسی و تأیید کنید." }, { status: 409 });
    }
    await prisma.actionApproval.update({ where: { id: priorApproval.id }, data: { approved: false } });

    // Retrieve active Liara API token
    const apiToken = dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "";
    const teamId = run.teamId || dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || "";

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret =
      process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    // 2. Call Python engine to execute liara env set and re-verify
    const res = await fetch(`${engineUrl}/agent/remediate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        app_id: run.targetApp,
        remediation,
        approval: {
          run_id: run.id,
          action_id: priorApproval.actionId,
          operation: priorApproval.operation,
          target: priorApproval.target,
          approved: true,
          plan_digest: planDigest,
        },
        expected_digest: planDigest,
        api_token: apiToken,
        team_id: teamId || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "لیارا تغییر پیشنهادی را نپذیرفت؛ سرویس به‌عنوان اصلاح‌شده گزارش نمی‌شود." },
        { status: res.status }
      );
    }

    if (data.ok !== true || data.remediation_result?.ok !== true) {
      return NextResponse.json(
        { ok: false, error: "ثبت متغیر در لیارا تأیید نشد؛ بررسی سلامت و گزارش موفقیت انجام نشد." },
        { status: 502 }
      );
    }

    const verification = data.verification;
    const isRecovered = verification?.application_health === "healthy";
    const finalStatus = isRecovered ? "succeeded" : "failed";

    // 3. Update Run in PostgreSQL
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        verification,
        finishedAt: isRecovered ? new Date() : undefined,
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "remediation_applied_and_verified",
        actor: user.username,
        metadata: {
          env_variable: remediation.env_variable,
          isRecovered,
          application_health: verification?.application_health,
          http_status_code: verification?.http_status_code,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      run: updatedRun,
      verification,
      remediation_result: data.remediation_result,
      isRecovered,
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: "اجرای راهکار کامل نشد؛ هیچ موفقیتی تأیید نشده است." }, { status: 500 });
  }
}

