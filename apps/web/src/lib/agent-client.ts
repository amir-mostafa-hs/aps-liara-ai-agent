export interface EngineHealthResponse {
  status: string;
  service: string;
  version: string;
}

export async function checkEngineHealth(): Promise<{
  ok: boolean;
  data?: EngineHealthResponse;
  error?: string;
  statusCode?: number;
}> {
  const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
  const internalSecret = process.env.INTERNAL_AGENT_SECRET || "dev-secret-change-me";

  try {
    const res = await fetch(`${engineUrl}/health`, {
      method: "GET",
      headers: {
        "X-Internal-Secret": internalSecret,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return {
        ok: false,
        statusCode: res.status,
        error: `Engine responded with status ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as EngineHealthResponse;
    return {
      ok: true,
      statusCode: res.status,
      data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Could not connect to Agent Engine: ${message}`,
    };
  }
}

