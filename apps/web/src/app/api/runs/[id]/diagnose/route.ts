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

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret =
      process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });
    const apiToken = dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "";
    const teamId = run.teamId || dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || "";

    // Send deployment logs if available; otherwise pass empty string to let engine fetch bounded runtime logs via CLI
    const logs = run.redactedLogs?.trim() || "";

    const res = await fetch(`${engineUrl}/agent/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        app_id: run.targetApp || "demo-app",
        logs,
        provider_status: run.providerStatus || "success",
        api_token: apiToken,
        team_id: teamId || undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || "Diagnosis failed" },
        { status: res.status }
      );
    }

    const diagnosis = data.diagnosis;

    // Update run in PostgreSQL with remediationPlan and status
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        remediationPlan: diagnosis,
        status: "diagnosing",
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "sre_diagnosed",
        actor: user.username,
        metadata: {
          missing_variable: diagnosis.missing_variable,
          root_cause: diagnosis.root_cause,
          evidence: diagnosis.error_evidence,
        },
      },
    });

    return NextResponse.json({ ok: true, run: updatedRun, diagnosis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

