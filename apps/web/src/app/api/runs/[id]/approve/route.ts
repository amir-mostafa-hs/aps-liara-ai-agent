import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActionForApproval } from "@/lib/plan-digest";
import { verifyPlanIntegrity } from "@/lib/plan-digest";

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
    const body = await req.json().catch(() => ({}));
    const { actionId, planDigest: providedDigest } = body;

    const run = await prisma.run.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    if (run.status !== "awaiting_approval") {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot approve run in status '${run.status}'. Must be 'awaiting_approval'.`,
        },
        { status: 400 }
      );
    }

    const plan = run.planDetails as any;
    if (!plan || !plan.digest) {
      return NextResponse.json(
        { ok: false, error: "Run has no valid planDetails or digest" },
        { status: 400 }
      );
    }

    // Verify cryptographic integrity of plan against stored digest
    const isValid = verifyPlanIntegrity(plan, plan.digest);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Security violation: Plan details failed cryptographic integrity verification." },
        { status: 400 }
      );
    }

    // If client supplied a digest, ensure it matches
    if (providedDigest && providedDigest !== plan.digest) {
      return NextResponse.json(
        { ok: false, error: "Digest mismatch: Provided plan digest does not match the canonical plan." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    // Resolve intended action from plan details with accurate operation and target
    const planActions = (plan.actions || []) as any[];
    const {
      actionId: resolvedActionId,
      operation: resolvedOperation,
      target: resolvedTarget,
    } = resolveActionForApproval(planActions, actionId, run.targetApp || "unknown");

    // Record ActionApproval
    const approval = await prisma.actionApproval.create({
      data: {
        runId: run.id,
        userId: dbUser?.id,
        actionId: resolvedActionId,
        operation: resolvedOperation,
        target: resolvedTarget,
        approved: true,
        planDigest: plan.digest,
      },
    });

    // Transition Run status to approved
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "approved",
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "plan_approved",
        actor: user.username,
        metadata: {
          approvalId: approval.id,
          digest: plan.digest,
        },
      },
    });

    return NextResponse.json({ ok: true, run: updatedRun, approval });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

