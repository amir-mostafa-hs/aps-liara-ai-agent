"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Bot,
  Key,
  Cloud,
  LogOut,
  LogIn,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

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

interface UserData {
  authenticated: boolean;
  username?: string;
}

interface TokenData {
  configured: boolean;
  maskedToken?: string;
}

interface LiaraApp {
  project_id: string;
  type: string;
  status: string;
}

interface TestConnectionResult {
  ok: boolean;
  app_count?: number;
  apps?: LiaraApp[];
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [newToken, setNewToken] = useState("");
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestConnectionResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hRes, uRes, tRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/settings/liara-token", { cache: "no-store" }),
      ]);

      const [hData, uData, tData] = await Promise.all([
        hRes.json().catch(() => null),
        uRes.json().catch(() => null),
        tRes.json().catch(() => null),
      ]);

      setHealth(hData);
      setUser(uData);
      setTokenData(tData);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealth({
        status: "down",
        timestamp: new Date().toISOString(),
        database: { status: "unknown", error: "Endpoint unreachable" },
        engine: { status: "unknown", error: "Web API unreachable" },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.trim()) return;
    setSavingToken(true);
    try {
      const res = await fetch("/api/settings/liara-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setTokenData({ configured: data.configured, maskedToken: data.maskedToken });
        setIsEditingToken(false);
        setNewToken("");
      } else {
        alert(data.error || "Failed to update token");
      }
    } finally {
      setSavingToken(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch("/api/liara/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setConnectionResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectionResult({ ok: false, error: msg });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser({ authenticated: false });
    router.refresh();
  };

  const isHealthy = health?.status === "healthy";
  const dbConnected = health?.database.status === "connected";
  const engineConnected = health?.engine.status === "healthy";

  return (
    <div className="space-y-8">
      {/* Top Banner with Operator Auth Badge */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
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
            Real-time status of Next.js Fullstack, PostgreSQL Database, and Python LangChain Engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.authenticated ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Operator: <strong>{user.username}</strong></span>
              <button
                onClick={handleLogout}
                className="ml-2 text-zinc-400 hover:text-red-400 transition"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              <LogIn className="h-3.5 w-3.5" />
              Operator Login
            </Link>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Liara Cloud Configuration & Live Connection Card (Ticket 02 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Liara Cloud Credentials & Connection</h3>
              <p className="text-xs text-zinc-400">
                Configure your Liara API token and verify access to your cloud projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingToken(!isEditingToken)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
            >
              {isEditingToken ? "Cancel" : tokenData?.configured ? "Update Token" : "Set Token"}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !tokenData?.configured}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingConnection ? "animate-spin" : ""}`} />
              {testingConnection ? "Testing Connection..." : "Test Connection"}
            </button>
          </div>
        </div>

        {/* Token Display or Edit Form */}
        {isEditingToken ? (
          <form onSubmit={handleSaveToken} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Paste your Liara API Token here..."
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingToken}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {savingToken ? "Saving..." : "Save Token"}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Current Token:</span>
              <span className="font-mono text-zinc-200">
                {tokenData?.configured ? tokenData.maskedToken : "Not Configured"}
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                tokenData?.configured
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {tokenData?.configured ? "Token Active (Masked)" : "No Token"}
            </span>
          </div>
        )}

        {/* Test Connection Results View */}
        {connectionResult && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              connectionResult.ok
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : "border-red-500/30 bg-red-500/5 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {connectionResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>
                {connectionResult.ok
                  ? `Liara Cloud Connection Verified — Found ${connectionResult.app_count} Active Project(s)`
                  : `Connection Failed: ${connectionResult.error}`}
              </span>
            </div>

            {connectionResult.ok && connectionResult.apps && connectionResult.apps.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {connectionResult.apps.map((app) => (
                  <div
                    key={app.project_id}
                    className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-zinc-900/80 p-2.5 text-zinc-200"
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{app.project_id}</div>
                      <div className="text-[10px] text-zinc-400">Type: {app.type}</div>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              <p className="text-xs text-zinc-400">Prisma ORM (Docker Compose)</p>
            </div>
            <p className="text-xs text-zinc-400">
              {dbConnected
                ? "Stores audit logs, deployment runs, approvals, and credentials securely."
                : health?.database.error || "Awaiting database connection."}
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
            Port: <span className="font-mono text-zinc-300">5432</span> (Docker)
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

      {/* Pipeline Navigation */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
        <h3 className="font-semibold text-zinc-100">Core Deployment & SRE Pipeline</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span>STEP 1</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm font-medium text-zinc-200">Operator Setup</div>
            <div className="text-xs text-zinc-400">Login & Liara Token connection verified</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1 opacity-80">
            <div className="text-xs font-bold text-zinc-400">STEP 2</div>
            <div className="text-sm font-medium text-zinc-200">Project Inspection</div>
            <div className="text-xs text-zinc-400">Static Node.js inspection & evidence check (Ticket 03)</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1 opacity-80">
            <div className="text-xs font-bold text-zinc-400">STEP 3</div>
            <div className="text-sm font-medium text-zinc-200">Plan & Approval Gate</div>
            <div className="text-xs text-zinc-400">LLM structured plan & human sign-off (Ticket 04)</div>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-1 opacity-80">
            <div className="text-xs font-bold text-zinc-400">STEP 4</div>
            <div className="text-sm font-medium text-zinc-200">Deploy & SRE Loop</div>
            <div className="text-xs text-zinc-400">Real deploy, logs stream & crash recovery (Tickets 05-07)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
