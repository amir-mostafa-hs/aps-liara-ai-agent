import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkEngineHealth } from "@/lib/agent-client";

export async function GET() {
  const timestamp = new Date().toISOString();

  // 1. Check Database connection
  let dbStatus = "connected";
  let dbError: string | null = null;

  try {
    // Attempt a light ping
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: unknown) {
    dbStatus = "disconnected";
    dbError = err instanceof Error ? err.message : String(err);
  }

  // 2. Check Python Agent Engine
  const engineHealth = await checkEngineHealth();

  const isHealthy = dbStatus === "connected" && engineHealth.ok;

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp,
    database: {
      status: dbStatus,
      ...(dbError ? { error: dbError } : {}),
    },
    engine: {
      status: engineHealth.ok ? "healthy" : "unreachable",
      ...(engineHealth.data ? { service: engineHealth.data.service, version: engineHealth.data.version } : {}),
      ...(engineHealth.error ? { error: engineHealth.error } : {}),
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
  });
}

