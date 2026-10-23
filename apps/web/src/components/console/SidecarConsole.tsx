"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal as TerminalIcon,
  Server,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  Loader2,
  ExternalLink,
  Copy,
  Trash2,
} from "lucide-react";

export interface CloudService {
  name: string;
  type: string; // "app" | "postgres" | "mysql" | "redis" | "mongodb"
  status: string; // "running" | "deploying" | "failed" | "created"
  endpoint?: string;
  port?: number;
}

export interface LiaraTeam {
  id: string;
  name: string;
}

export interface LiaraAccountSettings {
  configured: boolean;
  maskedToken: string;
  teamId: string;
  teams?: LiaraTeam[];
}

export interface SidecarProps {
  logs: string[];
  services: CloudService[];
  systemHealth?: {
    database: boolean;
    engine: boolean;
  };
  onClearLogs?: () => void;
  isStreaming?: boolean;
  onRefreshHealth?: () => void;
  isRefreshingHealth?: boolean;
  onRefreshServices?: () => void;
  isRefreshingServices?: boolean;
  onSelectService?: (serviceName: string) => void;
  selectedServiceName?: string;
  accountSettings?: LiaraAccountSettings;
  onUpdateAccountSettings?: (payload: { token?: string; teamId?: string }) => Promise<{ ok: boolean; error?: string }>;
  onTestConnection?: (payload?: { api_token?: string; team_id?: string }) => Promise<{ ok: boolean; error?: string; teams?: LiaraTeam[] }>;
}

export function SidecarConsole({
  logs = [],
  services = [],
  systemHealth = { database: true, engine: true },
  onClearLogs,
  isStreaming = false,
  onRefreshHealth,
  isRefreshingHealth = false,
  onRefreshServices,
  isRefreshingServices = false,
  onSelectService,
  selectedServiceName,
  accountSettings,
  onUpdateAccountSettings,
  onTestConnection,
}: SidecarProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "services" | "health" | "settings">("terminal");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Settings tab local state
  const [newTokenInput, setNewTokenInput] = useState("");
  const [showTokenText, setShowTokenText] = useState(false);
  const [teamIdInput, setTeamIdInput] = useState(accountSettings?.teamId || "");
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [fetchedTeams, setFetchedTeams] = useState<LiaraTeam[]>(accountSettings?.teams || []);

  useEffect(() => {
    if (accountSettings?.teamId !== undefined) {
      setTeamIdInput(accountSettings.teamId);
    }
  }, [accountSettings?.teamId]);

  useEffect(() => {
    if (accountSettings?.teams && accountSettings.teams.length > 0) {
      setFetchedTeams(accountSettings.teams);
    }
  }, [accountSettings?.teams]);

  useEffect(() => {
    if (activeTab === "terminal" && logs.length > 0) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunTestConnection = async () => {
    if (!onTestConnection) return;
    setIsTestingConn(true);
    setTestResult(null);
    try {
      const res = await onTestConnection({
        api_token: newTokenInput.trim() || undefined,
        team_id: teamIdInput.trim() || undefined,
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "اتصال به حساب و پلتفرم لیارا با موفقیت برقرار شد." });
        if (res.teams && res.teams.length > 0) {
          setFetchedTeams(res.teams);
        }
      } else {
        setTestResult({ ok: false, message: res.error || "خطا در برقراری ارتباط با لیارا" });
      }
    } catch (err: unknown) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSaveAccountSettings = async () => {
    if (!onUpdateAccountSettings) return;
    setIsSavingSettings(true);
    setSaveResult(null);
    try {
      const payload: { token?: string; teamId?: string } = {};
      if (newTokenInput.trim()) payload.token = newTokenInput.trim();
      payload.teamId = teamIdInput.trim();

      const res = await onUpdateAccountSettings(payload);
      if (res.ok) {
        setSaveResult({ ok: true, message: "تنظیمات حساب کاربری و تیم فعال با موفقیت به‌روزرسانی شد." });
        setNewTokenInput("");
      } else {
        setSaveResult({ ok: false, message: res.error || "خطا در به‌روزرسانی تنظیمات" });
      }
    } catch (err: unknown) {
      setSaveResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getServiceIcon = (type: string) => {
    if (type.includes("postgres")) return "/assets/svc-postgres.webp";
    if (type.includes("redis")) return "/assets/svc-redis.webp";
    return "/assets/svc-node.webp";
  };

  if (isCollapsed) {
    return (
      <aside className="w-full lg:w-14 h-12 lg:h-full bg-zinc-950/90 border-t lg:border-t-0 lg:border-r border-zinc-800 flex lg:flex-col items-center justify-between px-3 py-2 lg:py-4 lg:gap-4 shrink-0 transition-all select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-none bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
          title="باز کردن کنسول جانبی"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex items-center lg:flex-col gap-2">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("terminal");
            }}
            className={`p-2 rounded-none transition-colors cursor-pointer border ${
              activeTab === "terminal" ? "bg-zinc-900 text-liara border-zinc-700" : "text-zinc-400 hover:bg-zinc-900/40 border-transparent"
            }`}
            title="کنسول و لاگ‌ها"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-terminal.webp" alt="" className="ico !w-5 !h-5" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("services");
            }}
            className={`p-2 rounded-none transition-colors cursor-pointer border ${
              activeTab === "services" ? "bg-zinc-900 text-liara border-zinc-700" : "text-zinc-400 hover:bg-zinc-900/40 border-transparent"
            }`}
            title="سرویس‌های ابری"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-services.webp" alt="" className="ico !w-5 !h-5" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("health");
            }}
            className={`p-2 rounded-none transition-colors cursor-pointer border ${
              activeTab === "health" ? "bg-zinc-900 text-liara border-zinc-700" : "text-zinc-400 hover:bg-zinc-900/40 border-transparent"
            }`}
            title="سلامت سیستم"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-health.webp" alt="" className="ico !w-5 !h-5" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("settings");
            }}
            className={`p-2 rounded-none transition-colors cursor-pointer border ${
              activeTab === "settings" ? "bg-zinc-900 text-liara border-zinc-700" : "text-zinc-400 hover:bg-zinc-900/40 border-transparent"
            }`}
            title="تنظیمات اکانت"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-key.webp" alt="" className="ico !w-5 !h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      dir="ltr"
      className="h-[38vh] shrink-0 border-t border-zinc-800 bg-zinc-950/80 lg:h-auto lg:w-[40%] lg:max-w-[500px] lg:border-r lg:border-t-0 flex flex-col overflow-hidden"
    >
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-1 text-xs" dir="rtl">
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-mono transition-all border ${
              activeTab === "terminal"
                ? "bg-zinc-900 text-liara border-zinc-700 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-terminal.webp" alt="" className="ico !h-6 !w-6" />
            <span>لاگ‌ها</span>
            {isStreaming && (
              <span className="flex h-1.5 w-1.5 rounded-none bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-mono transition-all border ${
              activeTab === "services"
                ? "bg-zinc-900 text-liara border-zinc-700 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-services.webp" alt="" className="ico !h-6 !w-6" />
            <span>سرویس‌ها</span>
            {services.length > 0 && (
              <span className="rounded-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.2 font-mono">
                {services.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-mono transition-all border ${
              activeTab === "health"
                ? "bg-zinc-900 text-liara border-zinc-700 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-health.webp" alt="" className="ico !h-6 !w-6" />
            <span>سلامت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-mono transition-all border ${
              activeTab === "settings"
                ? "bg-zinc-900 text-liara border-zinc-700 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icon-key.webp" alt="" className="ico !h-6 !w-6" />
            <span>تنظیمات</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {activeTab === "services" && onRefreshServices && (
            <button
              type="button"
              onClick={onRefreshServices}
              disabled={isRefreshingServices}
              className="rounded-none border border-zinc-800 bg-zinc-900/50 px-2 py-1 hover:text-liara hover:border-zinc-700 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
              title="به‌روزرسانی سرویس‌ها"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshingServices ? "animate-spin" : ""}`} />
            </button>
          )}

          {activeTab === "health" && onRefreshHealth && (
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isRefreshingHealth}
              className="rounded-none border border-zinc-800 bg-zinc-900/50 px-2 py-1 hover:text-liara hover:border-zinc-700 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
              title="بررسی دوباره سلامت"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshingHealth ? "animate-spin" : ""}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse"
            className="rounded-none border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-400 hover:text-liara hover:border-zinc-700 cursor-pointer transition-colors"
            title="جمع کردن پنل"
          >
            —
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="min-h-0 flex-1 overflow-hidden relative">
        {/* Terminal Panel */}
        {activeTab === "terminal" && (
          <div className="flex flex-col h-full bg-[#0c0c0e]">
            {/* Dedicated Terminal Sub-header Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-zinc-800 bg-zinc-950 text-xs shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-none bg-emerald-400 pulse" />
                <span className="font-mono text-[11px] text-zinc-400">liara-session // stream</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  disabled={logs.length === 0}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-none border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-liara text-[11px] font-mono disabled:opacity-40 transition-colors cursor-pointer"
                  title="کپی لاگ‌ها در کلیپ‌بورد"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copied ? "کپی شد" : "کپی"}</span>
                </button>
                {onClearLogs && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    disabled={logs.length === 0}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-none border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-rose-400 text-[11px] font-mono disabled:opacity-40 transition-colors cursor-pointer"
                    title="پاک کردن لاگ‌های جاری"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>پاک‌سازی</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable logs */}
            <div className="scroll flex-1 overflow-y-auto p-4 font-mono text-xs leading-6 select-text">
              {logs.length === 0 ? (
                <p className="text-zinc-600 select-none">
                  $ liara ready. در انتظار استریم لاگ‌های دپلوی...
                </p>
              ) : (
                logs.map((line, idx) => {
                  const lower = line.toLowerCase();
                  let colorClass = "text-zinc-400";
                  if (lower.includes("error") || lower.includes("fail") || lower.includes("خطا")) {
                    colorClass = "text-rose-400";
                  } else if (lower.includes("warn") || lower.includes("هشدار")) {
                    colorClass = "text-amber-300";
                  } else if (lower.includes("ready") || lower.includes("✔") || lower.includes("postgres ready")) {
                    colorClass = "text-emerald-400";
                  } else if (lower.includes("liara") || lower.includes("step") || lower.includes("build") || lower.includes("inspect")) {
                    colorClass = "text-liara";
                  }
                  return (
                    <p key={idx} className={colorClass}>
                      {line}
                    </p>
                  );
                })
              )}
              <p className="text-liara font-bold animate-pulse">▌</p>
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {/* Services Panel */}
        {activeTab === "services" && (
          <div className="scroll h-full space-y-3 overflow-y-auto p-4" dir="rtl">
            {services.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/icon-services.webp" alt="" className="ico !w-12 !h-12 mx-auto opacity-50" />
                <p>هیچ سرویسی در این اکانت شناسایی نشد.</p>
              </div>
            ) : (
              services.map((svc) => {
                const isSelected = selectedServiceName === svc.name;
                const statusLower = svc.status.toLowerCase();
                const isRunning = statusLower === "running" || statusLower === "active";
                const isFailed = statusLower === "failed" || statusLower === "error";

                return (
                  <div
                    key={svc.name}
                    onClick={() => onSelectService?.(svc.name)}
                    className={`svc cursor-pointer transition-all ${
                      isSelected ? "border-liara bg-liara/10 shadow-[0_0_20px_-5px_#2cc4f4]" : "hover:border-white/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getServiceIcon(svc.type)}
                      alt=""
                      className="ico !h-12 !w-12 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <b className="text-sm font-bold text-zinc-100 truncate">{svc.name}</b>
                        <span
                          className={`pill text-[10px] font-medium ${
                            isRunning
                              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                              : isFailed
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-liara/15 text-liara border border-liara/30"
                          }`}
                        >
                          {isRunning ? "Running" : isFailed ? "Failed" : svc.status}
                        </span>
                      </div>
                      <p dir="ltr" className="mt-1 text-left font-mono text-xs text-zinc-400 truncate">
                        {svc.port ? `port ${svc.port}` : ""} {svc.endpoint ? `· ${svc.endpoint}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Health Panel */}
        {activeTab === "health" && (
          <div className="scroll h-full space-y-3 overflow-y-auto p-4" dir="rtl">
            <div className="svc justify-between text-sm">
              <span className="font-medium text-zinc-200">پایگاه‌داده داخلی (PostgreSQL)</span>
              <span
                className={`flex items-center gap-2 font-medium font-mono text-xs ${
                  systemHealth.database ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                <i
                  className={`h-1.5 w-1.5 rounded-none ${
                    systemHealth.database ? "bg-emerald-400 pulse" : "bg-rose-500"
                  }`}
                />
                {systemHealth.database ? "سالم" : "قطع ارتباط"}
              </span>
            </div>

            <div className="svc justify-between text-sm">
              <span className="font-medium text-zinc-200">موتور تحلیلی پایتون (Agent Engine)</span>
              <span
                className={`flex items-center gap-2 font-medium font-mono text-xs ${
                  systemHealth.engine ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                <i
                  className={`h-1.5 w-1.5 rounded-none ${
                    systemHealth.engine ? "bg-emerald-400 pulse" : "bg-rose-500"
                  }`}
                />
                {systemHealth.engine ? "سالم" : "قطع ارتباط با موتور"}
              </span>
            </div>

            <div className="svc justify-between text-sm">
              <span className="font-medium text-zinc-200">دسترسی به API لیارا</span>
              <span className="flex items-center gap-2 text-emerald-400 font-medium font-mono text-xs">
                <i className="h-1.5 w-1.5 rounded-none bg-emerald-400 pulse" />
                عملیاتی
              </span>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {activeTab === "settings" && (
          <div className="scroll h-full space-y-4 overflow-y-auto p-4 text-xs" dir="rtl">
            {/* Status card */}
            <div className="svc justify-between">
              <div>
                <b className="text-zinc-200 text-sm">وضعیت اتصال:</b>
                <p className="text-zinc-400 mt-0.5">
                  {accountSettings?.configured && accountSettings?.maskedToken
                    ? "متصل به لیارا"
                    : "توکن تنظیم نشده"}
                </p>
              </div>
              <span
                className={`pill ${
                  accountSettings?.configured
                    ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                }`}
              >
                {accountSettings?.configured ? "فعال" : "نیازمند تنظیم"}
              </span>
            </div>

            {/* Current token display */}
            {accountSettings?.maskedToken && (
              <div className="space-y-1">
                <label className="text-zinc-400 font-mono text-[11px]">توکن فعلی (ماسک‌شده):</label>
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={accountSettings.maskedToken}
                  className="inp opacity-80 cursor-default"
                />
              </div>
            )}

            {/* New token input */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium">کلید دسترسی جدید لیارا:</label>
              <div className="relative">
                <input
                  type={showTokenText ? "text" : "password"}
                  dir="ltr"
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="inp pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokenText(!showTokenText)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  {showTokenText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Team selection */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium">تیم کاری فعال در لیارا:</label>
              {fetchedTeams.length > 0 ? (
                <select
                  value={teamIdInput}
                  onChange={(e) => setTeamIdInput(e.target.value)}
                  className="inp"
                >
                  <option value="">حساب شخصی (بدون تیم)</option>
                  {fetchedTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  dir="ltr"
                  value={teamIdInput}
                  onChange={(e) => setTeamIdInput(e.target.value)}
                  placeholder="شناسه تیم (اختیاری)"
                  className="inp"
                />
              )}
            </div>

            {testResult && (
              <p
                className={`p-2.5 rounded-none border text-xs font-mono ${
                  testResult.ok
                    ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {testResult.message}
              </p>
            )}

            {saveResult && (
              <p
                className={`p-2.5 rounded-none border text-xs font-mono ${
                  saveResult.ok
                    ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {saveResult.message}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleRunTestConnection}
                disabled={isTestingConn}
                className="b0 flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isTestingConn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>تست اتصال</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAccountSettings}
                disabled={isSavingSettings}
                className="b2 flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSavingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-950" />}
                <span>ذخیره تنظیمات</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
