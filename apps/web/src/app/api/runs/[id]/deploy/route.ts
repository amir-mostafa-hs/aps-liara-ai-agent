import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDeployAction } from "@/lib/plan-digest";

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
      include: {
        approvals: {
          orderBy: { approvedAt: "desc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    const planDetails = run.planDetails as any;
    const planActions = Array.isArray(planDetails?.actions) ? planDetails.actions : [];
    const deployAction = getDeployAction(planActions);
    const deployActionId = deployAction?.action_id || "deploy";

    // Must find an approved ActionApproval specifically matching the deploy action or operation
    const validApproval = run.approvals.find(
      (a: { approved: boolean; actionId: string; operation: string }) =>
        a.approved &&
        (a.actionId === deployActionId ||
          a.actionId === "plan-approval" ||
          a.operation === "deploy")
    );

    if (!validApproval && run.status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          error: "Deployment prohibited: No valid ActionApproval recorded for this run.",
        },
        { status: 403 }
      );
    }

    // Retrieve active Liara API token
    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });
    const apiToken = dbUser?.liaraToken || process.env.LIARA_API_TOKEN || "";
    const teamId = run.teamId || dbUser?.liaraTeamId || process.env.LIARA_TEAM_ID || "";

    // Transition status to executing and record exact start time
    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "executing",
        startedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        runId: run.id,
        action: "deployment_started",
        actor: user.username,
        metadata: {
          targetApp: run.targetApp,
          platform: run.platform,
        },
      },
    });

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const internalSecret =
      process.env.INTERNAL_AGENT_SECRET || "dev-internal-secret-change-me";

    const actionId =
      validApproval?.actionId && validApproval.actionId !== "plan-approval"
        ? validApproval.actionId
        : deployActionId;
    const operation =
      validApproval?.operation || deployAction?.operation || "deploy";
    const target =
      validApproval?.target || deployAction?.target || run.targetApp || "";

    // Call Python engine SSE endpoint
    const engineRes = await fetch(`${engineUrl}/agent/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        plan: run.planDetails,
        approval: {
          run_id: run.id,
          action_id: actionId,
          operation: operation,
          target: target,
          approved: true,
          plan_digest: validApproval?.planDigest || "",
        },
        source_path: run.sourcePath,
        api_token: apiToken,
        team_id: teamId || undefined,
      }),
      cache: "no-store",
    });

    if (!engineRes.ok) {
      const errData = await engineRes.json().catch(() => ({}));
      await prisma.run.update({
        where: { id: run.id },
        data: { status: "failed" },
      });
      return NextResponse.json(
        { ok: false, error: errData.detail || "Agent engine rejected deployment" },
        { status: engineRes.status }
      );
    }

    // Create a streaming response back to the client while accumulating logs
    const decoder = new TextDecoder();
    let accumulatedLogs = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = engineRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const textChunk = decoder.decode(value, { stream: true });
            accumulatedLogs += textChunk;
            controller.enqueue(value);
          }
        } finally {
          // After stream completes, determine final status and persist logs
          const isSuccess = accumulatedLogs.includes("[EXIT] Process completed successfully (exit code 0).");
          const finalStatus = isSuccess ? "verifying" : "failed";
          const providerStatus = isSuccess ? "success" : "failed";

          await prisma.run
            .update({
              where: { id: run.id },
              data: {
                status: finalStatus,
                providerStatus,
                redactedLogs: accumulatedLogs,
                finishedAt: new Date(),
              },
            })
            .catch(console.error);

          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ event: "completed", ok: isSuccess, provider_status: providerStatus })}\n\n`,
          ));
          controller.close();

          await prisma.auditLog
            .create({
              data: {
                runId: run.id,
                action: "deployment_finished",
                actor: user.username,
                metadata: {
                  status: finalStatus,
                  logLength: accumulatedLogs.length,
                },
              },
            })
            .catch(console.error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

