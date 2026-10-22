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

    // Determine provider status from current run status
    const providerStatus = run.status === "failed" ? "failed" : "success";

    const res = await fetch(`${engineUrl}/agent/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        app_id: run.targetApp || "unknown",
        provider_status: providerStatus,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.detail || data.error || "Verification failed",
        },
        { status: res.status }
      );
    }

    const verification = data.verification;
    let nextStatus = run.status;

    if (verification.application_health === "healthy") {
      nextStatus = "succeeded";
    } else if (verification.application_health === "unhealthy") {
      nextStatus = "failed"; // Preserves failure state, ready for SRE diagnosis
    } else if (verification.application_health === "inconclusive") {
      nextStatus = "inconclusive";
    }

    // Persist verification outcome
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        verification,
        status: nextStatus,
        providerStatus: verification.provider_status,
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "endpoint_verified",
        actor: user.username,
        metadata: {
          endpoint_url: verification.endpoint_url,
          application_health: verification.application_health,
          http_status_code: verification.http_status_code,
          ready_for_sre: verification.ready_for_sre,
        },
      },
    });

    return NextResponse.json({ ok: true, run: updatedRun, verification });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
