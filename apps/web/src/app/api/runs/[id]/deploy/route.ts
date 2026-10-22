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
      include: {
        approvals: {
          orderBy: { approvedAt: "desc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    // Must be approved to deploy
    const validApproval = run.approvals.find((a) => a.approved);
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
          action_id: validApproval?.actionId || "plan-approval",
          operation: validApproval?.operation || "deploy",
          target: validApproval?.target || run.targetApp || "",
          approved: true,
          plan_digest:
            validApproval?.planDigest || (run.planDetails as any)?.digest || "",
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
          controller.close();

          // After stream completes, determine final status and persist logs
          const isSuccess =
            accumulatedLogs.includes("exit code 0") ||
            accumulatedLogs.includes("successfully pushed");
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

