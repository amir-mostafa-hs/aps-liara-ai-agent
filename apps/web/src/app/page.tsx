"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Server, Database, Bot, ArrowRight, ShieldCheck } from "lucide-react";

interface HealthData {
  status: string;
  timestamp: string;
  database: {
    status: string;
    error?: string;
  };
  engine: {
    status: string;
    service?: string;
    version?: string;
    error?: string;
  };
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealth({
        status: "down",
        timestamp: new Date().toISOString(),
        database: { status: "unknown", error: "Failed to connect to health endpoint" },
        engine: { status: "unknown", error: "Web API unreachable" },
      });
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isHealthy = health?.status === "healthy";
  const dbConnected = health?.database.status === "connected";
  const engineConnected = health?.engine.status === "healthy";

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">Hybrid System Status</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {isHealthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {isHealthy ? "All Services Connected" : "Service Degraded"}
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Real-time health of Next.js Fullstack, PostgreSQL Database, and Python LangChain Engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">Last checked: {lastChecked || "Checking..."}</span>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Web Application Tier */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Server className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Application Tier</h3>
              <p className="text-xs text-zinc-400">Next.js 15, App Router, TypeScript</p>
            </div>
            <p className="text-xs text-zinc-400">
              Serves user dashboard, renders shadcn UI components, and enforces operator session controls.
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
            Port: <span className="font-mono text-zinc-300">3000</span> (HTTP)
          </div>
        </div>

        {/* PostgreSQL Database */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Database className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                  dbConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {dbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">PostgreSQL Database</h3>
              <p className="text-xs text-zinc-400">Prisma ORM (Run Store & Audit)</p>
            </div>
            <p className="text-xs text-zinc-400">
              {dbConnected
                ? "Stores audit logs, deployment runs, approvals, and credentials securely."
                : health?.database.error || "Awaiting database connection."}
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
            Provider: <span className="font-mono text-zinc-300">PostgreSQL</span>
          </div>
        </div>

        {/* Python Agent Engine */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Bot className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                  engineConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {engineConnected ? "Connected" : "Unreachable"}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Agent Engine</h3>
              <p className="text-xs text-zinc-400">Python 3.13, FastAPI, LangChain</p>
            </div>
            <p className="text-xs text-zinc-400">
              {engineConnected
                ? "Authenticated via internal secret header. Handles code inspection, planning, and Liara CLI."
                : health?.engine.error || "Start Python engine on port 8000"}
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
            Internal Auth: <span className="font-mono text-emerald-400">X-Internal-Secret</span>
          </div>
        </div>
      </div>

      {/* Workflow Navigation Placeholder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-zinc-100">Core Deployment & SRE Pipeline</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1">
            <div className="text-xs font-bold text-blue-400">STEP 1</div>
            <div className="text-sm font-medium text-zinc-200">Operator Setup</div>
            <div className="text-xs text-zinc-400">Login & Liara API Token verification (Ticket 02)</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1">
            <div className="text-xs font-bold text-blue-400">STEP 2</div>
            <div className="text-sm font-medium text-zinc-200">Project Inspection</div>
            <div className="text-xs text-zinc-400">Static Node.js inspection & evidence check (Ticket 03)</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1">
            <div className="text-xs font-bold text-blue-400">STEP 3</div>
            <div className="text-sm font-medium text-zinc-200">Plan & Approval Gate</div>
            <div className="text-xs text-zinc-400">LLM structured plan & human sign-off (Ticket 04)</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1">
            <div className="text-xs font-bold text-emerald-400">STEP 4</div>
            <div className="text-sm font-medium text-zinc-200">Deploy & SRE Loop</div>
            <div className="text-xs text-zinc-400">Real deploy, logs stream & crash recovery (Tickets 05-07)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

