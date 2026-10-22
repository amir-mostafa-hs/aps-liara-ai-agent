import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePlanDigest } from "@/lib/plan-digest";

export async function GET() {
  const user = await getCurrentUser();
  if (!user.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      approvals: true,
      auditLogs: {
        orderBy: { timestamp: "desc" },
        take: 5,
      },
    },
  });

  return NextResponse.json({ ok: true, runs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sourcePath, targetApp, port, teamId } = body;

    if (!sourcePath || typeof sourcePath !== "string") {
      return NextResponse.json(
        { ok: false, error: "sourcePath is required" },
        { status: 400 }
      );
    }

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret =
      process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    // 1. Inspect project via engine
    const inspectRes = await fetch(`${engineUrl}/agent/inspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({ path: sourcePath.trim() }),
      cache: "no-store",
    });

    const inspectData = await inspectRes.json();
    if (!inspectRes.ok || !inspectData.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            inspectData.detail || inspectData.error || "Inspection failed",
        },
        { status: 400 }
      );
    }

    const analysis = inspectData.analysis;

    // 2. Generate deployment plan via engine
    const planRes = await fetch(`${engineUrl}/agent/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        analysis,
        target_app: targetApp || undefined,
        port: port ? Number(port) : undefined,
      }),
      cache: "no-store",
    });

    const planData = await planRes.json();
    if (!planRes.ok || !planData.ok) {
      return NextResponse.json(
        { ok: false, error: planData.detail || planData.error || "Planning failed" },
        { status: 400 }
      );
    }

    const plan = planData.plan;
    if (!plan.digest) {
      plan.digest = computePlanDigest(plan);
    }

    // Find db user
    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    const resolvedTeamId =
      (typeof teamId === "string" && teamId.trim()) ||
      dbUser?.liaraTeamId ||
      process.env.LIARA_TEAM_ID ||
      undefined;

    // 3. Persist Run in PostgreSQL with awaiting_approval status
    const run = await prisma.run.create({
      data: {
        userId: dbUser?.id,
        teamId: resolvedTeamId,
        sourceKind: "local",
        sourcePath: sourcePath.trim(),
        targetApp: plan.target_app,
        platform: plan.platform,
        status: "awaiting_approval",
        planDetails: plan,
        auditLogs: {
          create: {
            action: "plan_generated",
            actor: user.username,
            metadata: {
              plan_id: plan.plan_id,
              digest: plan.digest,
              target_app: plan.target_app,
              actions_count: plan.actions?.length || 0,
            },
          },
        },
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    return NextResponse.json({ ok: true, run });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

