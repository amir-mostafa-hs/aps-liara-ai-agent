import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Run ID is required" }, { status: 400 });
  }

  try {
    const run = await prisma.run.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    const diagnosis = run.remediationPlan as any;
    if (!diagnosis || !diagnosis.remediation) {
      return NextResponse.json(
        { ok: false, error: "No remediation plan exists for this run. Run SRE diagnosis first." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const customValue = typeof body.env_value === "string" && body.env_value.trim() ? body.env_value.trim() : null;

    if (customValue) {
      diagnosis.remediation.env_value = customValue;
      // Recompute canonical SHA-256 digest so ActionApproval never records a stale hash
      const crypto = await import("crypto");
      const canonicalObj = {
        diagnosis_id: diagnosis.diagnosis_id,
        error_evidence: diagnosis.error_evidence,
        missing_variable: diagnosis.missing_variable || "",
        remediation: {
          action_id: diagnosis.remediation.action_id,
          description: diagnosis.remediation.description,
          env_value: customValue,
          env_variable: diagnosis.remediation.env_variable,
          operation: diagnosis.remediation.operation,
          requires_approval: diagnosis.remediation.requires_approval,
          target: diagnosis.remediation.target,
        },
        requires_approval: diagnosis.requires_approval,
        root_cause: diagnosis.root_cause,
      };
      diagnosis.digest = crypto
        .createHash("sha256")
        .update(JSON.stringify(canonicalObj, Object.keys(canonicalObj).sort()))
        .digest("hex");
    }

    const remediation = diagnosis.remediation;

    // Retrieve active Liara API token
    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });
    const apiToken = dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "";
    const teamId = run.teamId || dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || "";

    // 1. Record ActionApproval for remediation with fresh matching digest
    const approval = await prisma.actionApproval.create({
      data: {
        runId: run.id,
        userId: dbUser?.id,
        actionId: remediation.action_id || "sre-remediation",
        operation: "set_env",
        target: run.targetApp || remediation.target || "unknown",
        approved: true,
        planDigest: diagnosis.digest || "sre-plan",
      },
    });

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
        app_id: run.targetApp || remediation.target,
        remediation,
        approval: {
          run_id: run.id,
          action_id: approval.actionId,
          operation: approval.operation,
          target: approval.target,
          approved: true,
          plan_digest: approval.planDigest,
        },
        expected_digest: approval.planDigest,
        api_token: apiToken,
        team_id: teamId || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || "Remediation execution failed" },
        { status: res.status }
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

