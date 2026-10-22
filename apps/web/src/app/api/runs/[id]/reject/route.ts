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
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

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
          error: `Cannot reject run in status '${run.status}'. Must be 'awaiting_approval'.`,
        },
        { status: 400 }
      );
    }

    const plan = (run.planDetails as any) || {};
    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    // Record ActionApproval with approved: false
    const approval = await prisma.actionApproval.create({
      data: {
        runId: run.id,
        userId: dbUser?.id,
        actionId: "plan-rejection",
        operation: "deploy",
        target: run.targetApp || "unknown",
        approved: false,
        planDigest: plan.digest || "none",
      },
    });

    // Transition Run status to cancelled
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "cancelled",
      },
      include: {
        approvals: true,
        auditLogs: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "plan_rejected",
        actor: user.username,
        metadata: {
          approvalId: approval.id,
          reason: reason || "Operator rejected deployment plan.",
        },
      },
    });

    return NextResponse.json({ ok: true, run: updatedRun, approval });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
