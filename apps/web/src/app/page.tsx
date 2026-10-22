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
  Search,
  FileCode2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  XCircle,
  AlertTriangle,
  Terminal,
  Rocket,
  Play,
  Copy,
  Trash2,
  Globe,
  Activity,
  ExternalLink,
  Wrench,
  Sparkles,
  Check,
  Users,
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
  teamId?: string;
}

interface LiaraApp {
  project_id: string;
  type: string;
  status: string;
}

interface LiaraTeam {
  id: string;
  name: string;
}

interface TestConnectionResult {
  ok: boolean;
  app_count?: number;
  apps?: LiaraApp[];
  team_id?: string | null;
  teams?: LiaraTeam[];
  error?: string;
}

interface ProjectAnalysis {
  detected_language: string;
  detected_platform: string;
  confidence: number;
  entrypoint?: string;
  start_command?: string;
  port: number;
  evidence_files: string[];
  required_env_names: string[];
  missing_configurations: string[];
}

export default function HomePage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [newToken, setNewToken] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestConnectionResult | null>(null);

  // Step 2 State: Project Inspection
  const [projectPath, setProjectPath] = useState("sample-apps/nodejs-demo");
  const [inspecting, setInspecting] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Step 3 State: Deployment Planning & Approval Gate (Ticket 04 Feature)
  const [targetApp, setTargetApp] = useState("demo-node-app");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [activeRun, setActiveRun] = useState<any | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Step 4 State: Live Deployment & Streaming Logs (Ticket 05 Feature)
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Step 5 State: Endpoint Verification (Ticket 06 Feature)
  const [verifyingEndpoint, setVerifyingEndpoint] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Step 6 State: SRE Diagnosis & Remediation (Ticket 07 Feature)
  const [diagnosing, setDiagnosing] = useState(false);
  const [remediating, setRemediating] = useState(false);
  const [sreError, setSreError] = useState<string | null>(null);
  const [customEnvValue, setCustomEnvValue] = useState("prod-secret-session-recovery-key-2026");

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
      if (tData?.teamId !== undefined) {
        setNewTeamId(tData.teamId || "");
      }
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
    if (!newToken.trim() && !tokenData?.configured) return;
    setSavingToken(true);
    try {
      const res = await fetch("/api/settings/liara-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: newToken.trim() || undefined,
          teamId: newTeamId.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTokenData({
          configured: data.configured,
          maskedToken: data.maskedToken,
          teamId: data.teamId,
        });
        setIsEditingToken(false);
        setNewToken("");
      } else {
        alert(data.error || "Failed to update configuration");
      }
    } finally {
      setSavingToken(false);
    }
  };

  const handleSelectTeam = async (selectedTeamId: string) => {
    const trimmed = selectedTeamId.trim();
    setNewTeamId(trimmed);
    try {
      const res = await fetch("/api/settings/liara-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: trimmed,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTokenData((prev) => (prev ? { ...prev, teamId: data.teamId } : prev));
        // Auto re-test with newly selected team
        setTestingConnection(true);
        setConnectionResult(null);
        try {
          const testRes = await fetch("/api/liara/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team_id: trimmed }),
          });
          const testData = await testRes.json();
          setConnectionResult(testData);
        } finally {
          setTestingConnection(false);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to switch team:", err);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch("/api/liara/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: tokenData?.teamId || newTeamId || undefined,
        }),
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

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projectPath.trim()) return;

    setInspecting(true);
    setInspectError(null);
    try {
      const res = await fetch("/api/project/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAnalysis(data.analysis);
      } else {
        setInspectError(data.error || "Project inspection failed.");
        setAnalysis(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInspectError(`Failed to connect to inspection service: ${msg}`);
      setAnalysis(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!projectPath.trim()) return;
    setGeneratingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: projectPath.trim(),
          targetApp: targetApp.trim() || undefined,
          port: analysis?.port || 3000,
          teamId: tokenData?.teamId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        setPlanError(data.error || "Failed to generate structured deployment plan.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPlanError(`Error creating plan: ${msg}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!activeRun?.id) return;
    setApproving(true);
    try {
      const plan = activeRun.planDetails;
      const res = await fetch(`/api/runs/${activeRun.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDigest: plan?.digest,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        alert(data.error || "Failed to approve plan.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Approval error: ${msg}`);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!activeRun?.id) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/runs/${activeRun.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Rejected by operator from dashboard gate.",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        alert(data.error || "Failed to reject plan.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Rejection error: ${msg}`);
    } finally {
      setRejecting(false);
    }
  };

  const handleExecuteDeploy = async () => {
    if (!activeRun?.id) return;
    setDeploying(true);
    setDeployError(null);
    setDeployLogs([`[AGENT] Connecting to deployment stream for ${activeRun.targetApp}...`]);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/deploy`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeployError(data.error || `Deployment execution failed (HTTP ${res.status})`);
        setDeploying(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setDeployError("Response stream is not readable.");
        setDeploying(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.text) {
                setDeployLogs((prev) => [...prev, payload.text.trimEnd()]);
              } else if (payload.error) {
                setDeployLogs((prev) => [...prev, `[ERROR] ${payload.error}`]);
              }
            } catch {
              setDeployLogs((prev) => [...prev, line.slice(6)]);
            }
          }
        }
      }

      // Refresh run to get updated status and database records
      const runRes = await fetch(`/api/runs/${activeRun.id}`, { cache: "no-store" });
      const runData = await runRes.json();
      if (runRes.ok && runData.ok) {
        setActiveRun(runData.run);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeployError(`Stream error: ${msg}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleVerifyEndpoint = async () => {
    if (!activeRun?.id) return;
    setVerifyingEndpoint(true);
    setVerificationError(null);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        setVerificationError(data.error || "Endpoint verification failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVerificationError(`Verification request error: ${msg}`);
    } finally {
      setVerifyingEndpoint(false);
    }
  };

  const handleDiagnose = async () => {
    if (!activeRun?.id) return;
    setDiagnosing(true);
    setSreError(null);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/diagnose`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        setSreError(data.error || "SRE log diagnosis failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSreError(`Diagnosis error: ${msg}`);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleApplyRemediation = async () => {
    if (!activeRun?.id) return;
    setRemediating(true);
    setSreError(null);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/remediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          env_value: customEnvValue.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveRun(data.run);
      } else {
        setSreError(data.error || "Failed to apply remediation.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSreError(`Remediation execution error: ${msg}`);
    } finally {
      setRemediating(false);
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

      {/* Step 1: Liara Cloud Configuration & Live Connection Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Step 1</span>
                <h3 className="font-semibold text-zinc-100">Liara Cloud Credentials & Connection</h3>
              </div>
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
          <form onSubmit={handleSaveToken} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Liara API Token</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder={tokenData?.configured ? "Leave empty to keep existing token..." : "Paste Liara API Token..."}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Liara Team ID <span className="text-zinc-500 text-[10px]">(Optional)</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value)}
                    placeholder="e.g. 6ace4ec3ec13fe0c3c19c4db"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-zinc-400">
                Leave Team ID empty to target your personal account projects, or enter your team ID for organization apps.
              </p>
              <button
                type="submit"
                disabled={savingToken}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {savingToken ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Current Token:</span>
                <span className="font-mono text-zinc-200">
                  {tokenData?.configured ? tokenData.maskedToken : "Not Configured"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Active Scope:</span>
                <span className="inline-flex items-center gap-1 font-mono text-zinc-200">
                  {tokenData?.teamId ? (
                    <>
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span>
                        تیم: {connectionResult?.teams?.find((t) => t.id === tokenData.teamId)?.name || "Team"} ({tokenData.teamId})
                      </span>
                    </>
                  ) : (
                    <span>Personal Account</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                  tokenData?.configured
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {tokenData?.configured ? "Token Active (Masked)" : "No Token"}
              </span>
              {tokenData?.teamId && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20">
                  Team Mode
                </span>
              )}
            </div>
          </div>
        )}

        {/* Test Connection Results View */}
        {connectionResult && (
          <div
            className={`rounded-xl border p-4 text-xs space-y-3 ${
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
                  ? `Liara Cloud Connection Verified — Found ${connectionResult.app_count} Active Project(s) ${
                      connectionResult.team_id ? `in Team (${connectionResult.team_id})` : "in Personal Account"
                    }`
                  : `Connection Failed: ${connectionResult.error}`}
              </span>
            </div>

            {/* Quick Team Switcher Chips */}
            {connectionResult.ok && connectionResult.teams && connectionResult.teams.length > 0 && (
              <div className="pt-1 border-t border-emerald-500/10">
                <div className="text-[11px] font-medium text-zinc-400 mb-1.5">Switch Scope:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTeam("")}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition border ${
                      !tokenData?.teamId
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                    }`}
                  >
                    Personal Account
                  </button>
                  {connectionResult.teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTeam(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition border ${
                        tokenData?.teamId === t.id
                          ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                          : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      <span>{t.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400">({t.id})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Grid */}
            {connectionResult.ok && connectionResult.apps && connectionResult.apps.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-400">Available Apps (click to select as Target):</div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {connectionResult.apps.map((app) => (
                    <div
                      key={app.project_id}
                      onClick={() => setTargetApp(app.project_id)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition ${
                        targetApp === app.project_id
                          ? "border-blue-500 bg-blue-500/10 text-white ring-1 ring-blue-500/50"
                          : "border-emerald-500/20 bg-zinc-900/80 text-zinc-200 hover:border-blue-500/40 hover:bg-zinc-850"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                          <span>{app.project_id}</span>
                          {targetApp === app.project_id && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">Selected</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">Platform: {app.type}</div>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Static Project Inspection (Ticket 03 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Step 2</span>
              <h3 className="font-semibold text-zinc-100">Static Project Inspection</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Inspect project files safely without executing untrusted code or repository hooks
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleInspect} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <FileCode2 className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="Enter project path (e.g. sample-apps/nodejs-demo)"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setProjectPath("sample-apps/nodejs-demo");
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
            >
              Preset: Sample App
            </button>
            <button
              type="submit"
              disabled={inspecting}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Search className={`h-3.5 w-3.5 ${inspecting ? "animate-spin" : ""}`} />
              {inspecting ? "Inspecting..." : "Inspect Project"}
            </button>
          </div>
        </form>

        {/* Inspection Error Alert */}
        {inspectError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{inspectError}</span>
          </div>
        )}

        {/* Analysis Results Card */}
        {analysis && (
          <div className="rounded-xl border border-indigo-500/20 bg-zinc-950/70 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100 text-sm">Project Analysis Results</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                  Confidence: {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
              <span className="font-mono text-[11px] text-zinc-400">
                Language: <strong className="text-zinc-200 capitalize">{analysis.detected_language}</strong>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-zinc-500 block text-[11px]">Detected Platform</span>
                <span className="font-semibold text-indigo-400 font-mono text-sm capitalize">
                  {analysis.detected_platform}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-zinc-500 block text-[11px]">Start Command</span>
                <span className="font-mono text-zinc-200">{analysis.start_command || "node server.js"}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-zinc-500 block text-[11px]">Default Port</span>
                <span className="font-mono text-zinc-200">{analysis.port}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-zinc-500 block text-[11px]">Entrypoint</span>
                <span className="font-mono text-zinc-200">{analysis.entrypoint || "server.js"}</span>
              </div>
            </div>

            {/* Evidence Files & Required Variables */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5">
                <span className="text-zinc-400 font-medium">Evidence Files:</span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.evidence_files.map((file) => (
                    <span
                      key={file}
                      className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300 border border-zinc-700"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-zinc-400 font-medium">Required Environment Variables:</span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.required_env_names.map((env) => (
                    <span
                      key={env}
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold border ${
                        env === "SERVICE_SECRET"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {env}
                      {env === "SERVICE_SECRET" && " (Mandatory for SRE Demo)"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                ℹ️ <strong>SRE Demo Scenario Ready:</strong> The detected test app requires <code>SERVICE_SECRET</code>. The deployment plan in Step 3 will be prepared, and deploying without this variable will trigger the controlled SRE crash and remediation loop.
              </div>
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition disabled:opacity-50"
              >
                <Bot className={`h-3.5 w-3.5 ${generatingPlan ? "animate-spin" : ""}`} />
                {generatingPlan ? "Generating Plan..." : "Generate Deployment Plan →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: LLM Deployment Planning & Interactive Approval Gate (Ticket 04 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Step 3</span>
                <h3 className="font-semibold text-zinc-100">AI Deployment Plan & Human Approval Gate</h3>
              </div>
              <p className="text-xs text-zinc-400">
                LangChain structured output orchestration with cryptographic plan integrity and explicit operator sign-off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={targetApp}
              onChange={(e) => setTargetApp(e.target.value)}
              placeholder="Target Liara App Name"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan || !user?.authenticated}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generatingPlan ? "animate-spin" : ""}`} />
              {generatingPlan ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </div>

        {planError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{planError}</span>
          </div>
        )}

        {/* Plan Display and Approval Gate */}
        {activeRun ? (
          <div className="space-y-4 rounded-xl border border-purple-500/20 bg-zinc-950/70 p-5">
            {/* Header & Status */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    Run ID: <span className="font-mono text-zinc-300">{activeRun.id.slice(0, 8)}...</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      activeRun.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : activeRun.status === "cancelled"
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                    }`}
                  >
                    Status: {activeRun.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Target: <strong className="text-zinc-200 font-mono">{activeRun.targetApp}</strong> | Platform:{" "}
                  <strong className="text-zinc-200 capitalize font-mono">{activeRun.platform}</strong>
                </div>
              </div>

              {/* Impact and Cost Badges */}
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-300 border border-zinc-700">
                  Impact: <strong className="uppercase text-amber-400">{activeRun.planDetails?.impact_level || "MEDIUM"}</strong>
                </span>
                {activeRun.planDetails?.cost_warning && (
                  <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-300 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Billable Resources Notice
                  </span>
                )}
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300 block">Proposed Mutating Actions:</span>
              <div className="grid gap-2">
                {activeRun.planDetails?.actions?.map((act: any, idx: number) => (
                  <div
                    key={act.action_id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-zinc-500 text-[11px]">#{idx + 1}</span>
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-300">
                        {act.operation}
                      </span>
                      <span className="text-zinc-200 font-medium">{act.description}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700">
                        Target: {act.target}
                      </span>
                      {act.requires_approval && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Sign-off Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Digest Display */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 overflow-hidden text-ellipsis">
                <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>SHA-256 Plan Digest:</span>
                <span className="text-zinc-300 select-all font-mono">
                  {activeRun.planDetails?.digest}
                </span>
              </div>
              <span className="shrink-0 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Tamper-Proof Protected
              </span>
            </div>

            {/* Approval Gate Decision Area */}
            {activeRun.status === "awaiting_approval" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span>Human-in-the-Loop Gate: Operator Decision Required</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Executing this plan will create or update resources on your Liara cloud account. Any modification to the plan will invalidate this approval digest.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleApprovePlan}
                    disabled={approving || rejecting}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className={`h-4 w-4 ${approving ? "animate-spin" : ""}`} />
                    {approving ? "Recording Approval..." : "Approve Plan & Proceed"}
                  </button>

                  <button
                    onClick={handleRejectPlan}
                    disabled={approving || rejecting}
                    className="flex items-center gap-2 rounded-lg bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
                  >
                    <XCircle className={`h-4 w-4 ${rejecting ? "animate-spin" : ""}`} />
                    {rejecting ? "Rejecting..." : "Reject Plan"}
                  </button>
                </div>
              </div>
            )}

            {activeRun.status === "approved" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Plan Approved:</strong> Cryptographic approval token recorded in PostgreSQL. Ready for deployment execution.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteDeploy}
                  disabled={deploying}
                  className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  <Rocket className={`h-3.5 w-3.5 ${deploying ? "animate-spin" : ""}`} />
                  {deploying ? "Deploying..." : "Execute Deployment →"}
                </button>
              </div>
            )}

            {activeRun.status === "cancelled" && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>
                  <strong>Plan Rejected:</strong> The execution run has been permanently cancelled. No cloud resources were modified.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
            {analysis
              ? "Project analyzed. Click 'Generate Plan' to create a typed, tamper-proof deployment proposal."
              : "Complete Step 2 (Project Inspection) first, then generate the AI deployment plan."}
          </div>
        )}
      </div>

      {/* Step 4: Real Liara Deployment Execution & Live Log Streaming (Ticket 05 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Step 4</span>
                <h3 className="font-semibold text-zinc-100">Live Deployment & Log Streaming</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Execute approved CLI operations with Server-Sent Events (SSE) streaming and real-time secret redaction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteDeploy}
              disabled={
                deploying ||
                !activeRun ||
                (activeRun.status !== "approved" && activeRun.status !== "executing")
              }
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition disabled:opacity-40"
            >
              <Rocket className={`h-3.5 w-3.5 ${deploying ? "animate-spin" : ""}`} />
              {deploying ? "Streaming Deployment..." : "Execute Deployment"}
            </button>
          </div>
        </div>

        {deployError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{deployError}</span>
          </div>
        )}

        {/* Live Terminal Window */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></span>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 ml-2">
                terminal &mdash; liara deploy {activeRun ? `--app ${activeRun.targetApp}` : ""} {activeRun?.teamId || tokenData?.teamId ? `--team-id ${activeRun?.teamId || tokenData?.teamId}` : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {deploying && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                  STREAMING
                </span>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deployLogs.join("\n"));
                }}
                className="text-zinc-400 hover:text-zinc-200 p-1 transition"
                title="Copy logs"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeployLogs([])}
                className="text-zinc-400 hover:text-zinc-200 p-1 transition"
                title="Clear terminal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-4 font-mono text-xs max-h-80 min-h-48 overflow-y-auto space-y-1 select-text">
            {deployLogs.length > 0 ? (
              deployLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    log.includes("[ERROR]")
                      ? "text-red-400 font-bold"
                      : log.includes("[EXIT]")
                      ? "text-amber-300 font-bold"
                      : log.includes("[AGENT]")
                      ? "text-cyan-300 font-semibold"
                      : log.includes("Successfully") || log.includes("success")
                      ? "text-emerald-400 font-semibold"
                      : "text-zinc-300"
                  }`}
                >
                  {log}
                </div>
              ))
            ) : (
              <div className="text-zinc-600 italic py-6 text-center">
                Terminal idle. Approve the plan in Step 3 and click &quot;Execute Deployment&quot; to stream real-time logs.
              </div>
            )}
          </div>
        </div>

        {/* Verification Trigger Banner once deployed */}
        {activeRun && (activeRun.status === "verifying" || activeRun.status === "failed" || activeRun.status === "succeeded") && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-300">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                Deployment finished. Run the independent health check to verify endpoint availability on Liara.
              </span>
            </div>
            <button
              type="button"
              onClick={handleVerifyEndpoint}
              disabled={verifyingEndpoint}
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifyingEndpoint ? "animate-spin" : ""}`} />
              {verifyingEndpoint ? "Verifying..." : "Verify Public Endpoint →"}
            </button>
          </div>
        )}
      </div>

      {/* Step 5: Public Endpoint Verification & Health Decoupling (Ticket 06 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Step 5</span>
                <h3 className="font-semibold text-zinc-100">Public Endpoint Verification & Health Decoupling</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Independent HTTP verification strictly distinguishing provider deployment state from actual application health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeRun?.targetApp && (
              <a
                href={`https://${activeRun.targetApp}.liara.run`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:bg-zinc-700 transition"
              >
                <span>https://{activeRun.targetApp}.liara.run</span>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              </a>
            )}
            <button
              onClick={handleVerifyEndpoint}
              disabled={verifyingEndpoint || !activeRun}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifyingEndpoint ? "animate-spin" : ""}`} />
              {verifyingEndpoint ? "Checking..." : "Verify Health"}
            </button>
          </div>
        </div>

        {verificationError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{verificationError}</span>
          </div>
        )}

        {/* Verification Results Cards */}
        {activeRun?.verification ? (
          <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-zinc-950/70 p-5">
            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              {/* Card 1: Provider Status */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                <span className="text-zinc-500 block text-[11px]">Provider Deployment Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold uppercase border ${
                      activeRun.verification.provider_status === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {activeRun.verification.provider_status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 pt-1">
                  Provider image release and process launch status.
                </p>
              </div>

              {/* Card 2: Application HTTP Health */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                <span className="text-zinc-500 block text-[11px]">Application HTTP Health</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold uppercase border ${
                      activeRun.verification.application_health === "healthy"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : activeRun.verification.application_health === "unhealthy"
                        ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {activeRun.verification.application_health}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 pt-1">
                  Public endpoint probe response on <code>*.liara.run</code>.
                </p>
              </div>

              {/* Card 3: Status Code & Latency */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                <span className="text-zinc-500 block text-[11px]">HTTP Response & Latency</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-200 font-bold">
                    {activeRun.verification.http_status_code
                      ? `HTTP ${activeRun.verification.http_status_code}`
                      : "No HTTP Response"}
                  </span>
                  {activeRun.verification.latency_ms && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      {activeRun.verification.latency_ms} ms
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 pt-1">
                  Round-trip latency to deployed service.
                </p>
              </div>
            </div>

            {/* Response Snippet or Error Details */}
            {(activeRun.verification.response_body_snippet || activeRun.verification.error_message) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 text-xs space-y-1">
                <span className="text-zinc-400 text-[11px] block font-medium">Endpoint Response / Error:</span>
                <pre className="font-mono text-[11px] text-zinc-300 bg-zinc-950 p-2.5 rounded border border-zinc-800/80 overflow-x-auto whitespace-pre-wrap">
                  {activeRun.verification.response_body_snippet || activeRun.verification.error_message}
                </pre>
              </div>
            )}

            {/* Deliberate SRE Failure Notice */}
            {activeRun.verification.ready_for_sre && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Deliberate SRE Scenario Detected: Provider Deployed But App Crashed</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  The cloud provider reported deployment success, but the HTTP probe detected an application crash / connection error.
                  The agent did <strong>not</strong> report a false success. Proceed to Step 6 below for autonomous SRE Log Diagnosis & Remediation.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
            {activeRun
              ? "Deploy your application in Step 4, then click 'Verify Health' to inspect live public availability."
              : "Complete the previous deployment steps first."}
          </div>
        )}
      </div>

      {/* Step 6: Autonomous SRE Diagnosis & Approved Remediation (Ticket 07 Feature) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Step 6</span>
                <h3 className="font-semibold text-zinc-100">Autonomous SRE Diagnosis & Approved Remediation</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Closed-loop incident recovery: analyze crash logs, cite root cause evidence, propose targeted fix, and enforce operator approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiagnose}
              disabled={diagnosing || !activeRun}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-500 transition disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${diagnosing ? "animate-spin" : ""}`} />
              {diagnosing ? "Diagnosing Crash Logs..." : "Diagnose Failure with AI"}
            </button>
          </div>
        </div>

        {sreError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{sreError}</span>
          </div>
        )}

        {/* Diagnosis & Remediation Box */}
        {activeRun?.remediationPlan ? (
          <div className="space-y-5 rounded-xl border border-amber-500/30 bg-zinc-950/80 p-5">
            {/* Incident Summary Card */}
            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  SRE Root Cause Diagnosis
                </span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/20">
                  Target: {activeRun.remediationPlan.missing_variable || "Configuration Issue"}
                </span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {activeRun.remediationPlan.root_cause}
              </p>

              {/* Exact Log Evidence Citation */}
              {activeRun.remediationPlan.error_evidence && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-medium text-zinc-400">Exact Log Evidence Cited by Agent:</span>
                  <div className="rounded border border-red-500/30 bg-red-950/20 p-2.5 font-mono text-xs text-red-300 overflow-x-auto">
                    {activeRun.remediationPlan.error_evidence}
                  </div>
                </div>
              )}
            </div>

            {/* Proposed Remediation Action & Approval Gate */}
            {activeRun.remediationPlan.remediation && (
              <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-zinc-200">Proposed Autonomous Remediation Plan</span>
                    <p className="text-[11px] text-zinc-400">
                      Gated by operator sign-off before executing mutating CLI command on Liara
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400 border border-zinc-700">
                      SHA-256: {activeRun.remediationPlan.digest?.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Environment Variable:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {activeRun.remediationPlan.remediation.env_variable}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400">
                      Remediation Value (Secret will be injected and redacted):
                    </label>
                    <input
                      type="text"
                      value={customEnvValue}
                      onChange={(e) => setCustomEnvValue(e.target.value)}
                      placeholder="Enter value for missing secret..."
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-medium text-zinc-400">Command Preview:</span>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-zinc-300 overflow-x-auto">
                      liara env:set {activeRun.remediationPlan.remediation.env_variable}=*** --app {activeRun.targetApp} {activeRun?.teamId || tokenData?.teamId ? `--team-id ${activeRun?.teamId || tokenData?.teamId}` : ""}
                    </div>
                  </div>
                </div>

                {/* Operator Approval Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800">
                  <span className="text-[11px] text-zinc-400">
                    Executing remediation will set the variable on Liara Cloud and trigger container reboot.
                  </span>
                  <button
                    onClick={handleApplyRemediation}
                    disabled={remediating || activeRun.status === "succeeded"}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50 shrink-0"
                  >
                    <ShieldCheck className={`h-3.5 w-3.5 ${remediating ? "animate-spin" : ""}`} />
                    {remediating
                      ? "Applying Fix & Probing..."
                      : activeRun.status === "succeeded"
                      ? "Remediation Applied"
                      : "Approve Fix & Recover Service"}
                  </button>
                </div>
              </div>
            )}

            {/* Success Celebration Banner */}
            {activeRun.status === "succeeded" && activeRun.verification?.application_health === "healthy" && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>🎉 Service Successfully Recovered! Incident Closed.</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  The missing variable was applied to Liara Cloud, the container restarted cleanly, and the public health check on{" "}
                  <a
                    href={`https://${activeRun.targetApp}.liara.run`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-emerald-300 underline underline-offset-2"
                  >
                    https://{activeRun.targetApp}.liara.run
                  </a>{" "}
                  returned <strong>HTTP 200 OK</strong>. The closed-loop SRE workflow completed end-to-end.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
            {activeRun?.verification?.ready_for_sre
              ? "Crash detected in Step 5! Click 'Diagnose Failure with AI' above to analyze root cause logs and formulate remediation."
              : "Verify your deployment in Step 5. If an application failure occurs, SRE self-healing activates here."}
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
        <h3 className="font-semibold text-zinc-100">End-to-End Autonomous Pipeline</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span>STEP 1</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm font-medium text-zinc-200">Operator Setup</div>
            <div className="text-xs text-zinc-400">Auth & Liara Token verified</div>
          </div>

          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
              <span>STEP 2</span>
              {analysis ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </div>
            <div className="text-sm font-medium text-zinc-200">Inspection</div>
            <div className="text-xs text-zinc-400">Static Node.js evidence parsed</div>
          </div>

          <div
            className={`rounded-lg p-4 space-y-1 border ${
              activeRun?.status === "approved"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : activeRun?.status === "awaiting_approval"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                : activeRun?.status === "cancelled"
                ? "border-red-500/30 bg-red-500/5 text-red-300"
                : analysis
                ? "border-purple-500/30 bg-purple-500/5 text-purple-300"
                : "border-zinc-800/60 bg-zinc-900/60 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>STEP 3</span>
              {activeRun?.status === "approved" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : activeRun?.status === "awaiting_approval" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              ) : activeRun?.status === "cancelled" ? (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              ) : null}
            </div>
            <div className="text-sm font-medium text-zinc-200">Plan & Gate</div>
            <div className="text-xs text-zinc-400">
              {activeRun ? `Plan ${activeRun.status.replace("_", " ")}` : "Pydantic structured plan"}
            </div>
          </div>

          <div
            className={`rounded-lg p-4 space-y-1 border ${
              activeRun?.status === "executing"
                ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-300"
                : activeRun?.redactedLogs
                ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-300"
                : "border-zinc-800/60 bg-zinc-900/60 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>STEP 4</span>
              {activeRun?.status === "executing" ? (
                <Rocket className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              ) : activeRun?.redactedLogs ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              ) : null}
            </div>
            <div className="text-sm font-medium text-zinc-200">Deploy & SSE</div>
            <div className="text-xs text-zinc-400">
              {activeRun?.status === "executing"
                ? "Streaming CLI logs..."
                : activeRun?.redactedLogs
                ? "Logs streamed & redacted"
                : "Real Liara deployment"}
            </div>
          </div>

          <div
            className={`rounded-lg p-4 space-y-1 border ${
              activeRun?.verification?.application_health === "healthy"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : activeRun?.verification?.application_health === "unhealthy"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                : "border-zinc-800/60 bg-zinc-900/60 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>STEP 5</span>
              {activeRun?.verification?.application_health === "healthy" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : activeRun?.verification?.application_health === "unhealthy" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              ) : null}
            </div>
            <div className="text-sm font-medium text-zinc-200">Verify Health</div>
            <div className="text-xs text-zinc-400">
              {activeRun?.verification?.application_health
                ? `Health: ${activeRun.verification.application_health}`
                : "Independent HTTP probe"}
            </div>
          </div>

          <div
            className={`rounded-lg p-4 space-y-1 border ${
              activeRun?.status === "succeeded" && activeRun?.verification?.application_health === "healthy"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : activeRun?.remediationPlan
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                : "border-zinc-800/60 bg-zinc-900/60 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>STEP 6</span>
              {activeRun?.status === "succeeded" && activeRun?.verification?.application_health === "healthy" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : activeRun?.remediationPlan ? (
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
              ) : null}
            </div>
            <div className="text-sm font-medium text-zinc-200">SRE Self-Healing</div>
            <div className="text-xs text-zinc-400">
              {activeRun?.status === "succeeded" && activeRun?.verification?.application_health === "healthy"
                ? "Service recovered (HTTP 200)"
                : activeRun?.remediationPlan
                ? "Diagnosis & fix pending"
                : "Root cause analysis & fix"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
