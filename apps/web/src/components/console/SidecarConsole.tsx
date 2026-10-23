"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal as TerminalIcon,
  Server,
  Activity,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Users,
  Eye,
  EyeOff,
  Save,
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

  if (isCollapsed) {
    return (
      <aside className="w-full lg:w-12 h-12 lg:h-full bg-zinc-900 border-t lg:border-t-0 lg:border-r border-zinc-800 flex lg:flex-col items-center justify-between px-3 py-2 lg:py-4 lg:gap-4 shrink-0 transition-all select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
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
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "terminal" ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
            }`}
            title="ترمینال"
          >
            <TerminalIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("services");
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "services" ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
            }`}
            title="سرویس‌های ابری"
          >
            <Server className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("health");
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "health" ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
            }`}
            title="سلامت سیستم"
          >
            <Activity className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab("settings");
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "settings" ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
            }`}
            title="تنظیمات اکانت و تیم لیارا"
          >
            <KeyRound className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-[40%] lg:max-w-xl lg:min-w-[340px] h-[45vh] lg:h-full bg-zinc-900/95 border-t lg:border-t-0 lg:border-r border-zinc-800 flex flex-col shrink-0 transition-all overflow-hidden">
      {/* Top Bar with Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === "terminal"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
            <span>کنسول و لاگ‌ها</span>
            {isStreaming && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === "services"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>سرویس‌های ابری</span>
            {services.length > 0 && (
              <span className="rounded-full bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0.2">
                {services.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === "health"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>سلامت سیستم</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === "settings"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>تنظیمات اکانت</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === "terminal" && (
            <>
              <button
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors disabled:opacity-40"
                title="کپی لاگ‌ها"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  disabled={logs.length === 0}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  title="پاک کردن ترمینال"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors mr-1"
            title="بستن پنل"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "terminal" && (
          <div
            dir="ltr"
            className="h-full w-full bg-zinc-950 p-4 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-y-auto selection:bg-blue-600 selection:text-white"
          >
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 select-none">
                <TerminalIcon className="h-8 w-8 stroke-1 opacity-50" />
                <p>در انتظار شروع استریم لاگ‌های دپلوی یا رانتایم...</p>
              </div>
            ) : (
              logs.map((line, idx) => {
                const isError =
                  line.includes("[ERROR]") ||
                  line.includes("Error:") ||
                  line.includes("non-zero");
                const isSuccess =
                  line.includes("✔") ||
                  line.includes("successfully") ||
                  line.includes("exit code 0");
                const isAgent = line.startsWith("[AGENT]");

                return (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      isError
                        ? "text-rose-400"
                        : isSuccess
                        ? "text-emerald-400 font-semibold"
                        : isAgent
                        ? "text-blue-400 font-medium"
                        : "text-zinc-300"
                    }`}
                  >
                    {line}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        )}

        {activeTab === "services" && (
          <div className="h-full p-4 overflow-y-auto flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-zinc-400">
                سرویس‌های ابری در لیارا ({services.length})
              </div>
              {onRefreshServices && (
                <button
                  onClick={onRefreshServices}
                  disabled={isRefreshingServices}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800/60"
                  title="بروزرسانی وضعیت سرویس‌ها از لیارا"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${
                      isRefreshingServices ? "animate-spin text-blue-400" : ""
                    }`}
                  />
                  <span>بروزرسانی</span>
                </button>
              )}
            </div>
            {services.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                هنوز سرویسی در اکانت لیارا ایجاد نشده است یا توکن تنظیم نشده است. با ارسال سورس پروژه در چت، ایجنت دیتابیس و اپلیکیشن شما را خواهد ساخت.
              </div>
            ) : (
              services.map((svc, i) => {
                const isSelected = svc.type === "app" && svc.name === selectedServiceName;
                return (
                  <div
                    key={`${svc.type}-${svc.name}-${i}`}
                    onClick={() => {
                      if (svc.type === "app" && onSelectService) {
                        onSelectService(svc.name);
                      }
                    }}
                    className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-all ${
                      isSelected
                        ? "border-blue-500/60 bg-blue-950/20 shadow-sm"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    } ${svc.type === "app" ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {svc.type === "app" ? (
                          <Globe className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Database className="h-4 w-4 text-emerald-400" />
                        )}
                        <span className="text-sm font-semibold text-zinc-200">{svc.name}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                            مقصد دپلوی
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          svc.status === "running"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : svc.status === "failed"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}
                      >
                        {svc.status === "running"
                          ? "فعال و آنلاین"
                          : svc.status === "failed"
                          ? "خطا در اجرا"
                          : svc.status === "stopped"
                          ? "متوقف شده"
                          : "در حال دپلوی"}
                      </span>
                    </div>
                    {svc.endpoint && (
                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
                        <span className="text-[11px] text-zinc-500">دامنه دسترسی:</span>
                        <a
                          href={svc.endpoint.startsWith("http") ? svc.endpoint : `https://${svc.endpoint}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                          dir="ltr"
                        >
                          {svc.endpoint}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "health" && (
          <div className="h-full p-4 overflow-y-auto flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-zinc-400">وضعیت زیرساخت ایجنت</div>
              {onRefreshHealth && (
                <button
                  onClick={onRefreshHealth}
                  disabled={isRefreshingHealth}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800/60"
                  title="بررسی مجدد سلامت سیستم"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshingHealth ? "animate-spin text-blue-400" : ""}`} />
                  <span>بررسی مجدد</span>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className={`h-4 w-4 ${systemHealth.database ? "text-emerald-400" : "text-rose-400"}`} />
                <div>
                  <div className="text-xs font-medium text-zinc-200">دیتابیس PostgreSQL (Prisma)</div>
                  <div className="text-[11px] text-zinc-500">ذخیره گزارش‌ها، تاییدها و نشست‌ها</div>
                </div>
              </div>
              {systemHealth.database ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  قطع ارتباط / خطا
                </span>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className={`h-4 w-4 ${systemHealth.engine ? "text-emerald-400" : "text-rose-400"}`} />
                <div>
                  <div className="text-xs font-medium text-zinc-200">موتور هوش مصنوعی (FastAPI & LangChain)</div>
                  <div className="text-[11px] text-zinc-500">تحلیل کدبیس و هماهنگ‌کننده دپلوی</div>
                </div>
              </div>
              {systemHealth.engine ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  قطع ارتباط با موتور
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="h-full p-4 overflow-y-auto flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200">تنظیمات و دسترسی‌های لیارا</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  accountSettings?.configured
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {accountSettings?.configured ? "توکن فعال" : "توکن تنظیم نشده"}
              </span>
            </div>

            {/* API Token Section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">کلید دسترسی لیارا (API Token)</span>
                <a
                  href="https://console.liara.ir/API"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                >
                  دریافت کلید دسترسی
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="text-[11px] text-zinc-500">
                توکن فعلی ذخیره‌شده در سیستم:
              </div>
              <div
                dir="ltr"
                className="text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 select-all"
              >
                {accountSettings?.maskedToken || "هنوز توکنی تنظیم نشده است"}
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[11px] text-zinc-400">
                  ورود یا تغییر توکن جدید:
                </label>
                <div className="relative">
                  <input
                    type={showTokenText ? "text" : "password"}
                    value={newTokenInput}
                    onChange={(e) => setNewTokenInput(e.target.value)}
                    placeholder="مثال: lia_xxxxxxxxxxxx"
                    dir="ltr"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 pl-9 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenText(!showTokenText)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title={showTokenText ? "پنهان کردن" : "نمایش توکن"}
                  >
                    {showTokenText ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Team / Workspace Section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-medium text-zinc-300">فضای کاری و تیم لیارا</span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {teamIdInput ? `تیم انتخابی: ${teamIdInput}` : "حساب شخصی"}
                </span>
              </div>

              {fetchedTeams.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-zinc-400">انتخاب از تیم‌های اکانت:</label>
                  <select
                    value={teamIdInput}
                    onChange={(e) => setTeamIdInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">حساب شخصی (بدون تیم)</option>
                    {fetchedTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-400">شناسه تیم (Team ID):</label>
                <input
                  type="text"
                  value={teamIdInput}
                  onChange={(e) => setTeamIdInput(e.target.value)}
                  placeholder="اختیاری - برای حساب شخصی خالی بگذارید"
                  dir="ltr"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Test & Save Status Messages */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {saveResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  saveResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {saveResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                <span>{saveResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!onTestConnection) return;
                  setIsTestingConn(true);
                  setTestResult(null);
                  try {
                    const res = await onTestConnection({
                      api_token: newTokenInput.trim() || undefined,
                      team_id: teamIdInput.trim() || undefined,
                    });
                    if (res.ok) {
                      setTestResult({
                        ok: true,
                        message: `اتصال به لیارا موفق بود. (${res.teams?.length || 0} تیم در دسترس)`,
                      });
                      if (res.teams) {
                        setFetchedTeams(res.teams);
                      }
                    } else {
                      setTestResult({
                        ok: false,
                        message: res.error || "خطا در برقراری اتصال به لیارا",
                      });
                    }
                  } catch (err: unknown) {
                    setTestResult({
                      ok: false,
                      message: err instanceof Error ? err.message : "خطای غیرمنتظره در تست اتصال",
                    });
                  } finally {
                    setIsTestingConn(false);
                  }
                }}
                disabled={isTestingConn || isSavingSettings}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingConn ? "animate-spin text-blue-400" : ""}`} />
                <span>{isTestingConn ? "در حال تست..." : "بررسی اتصال"}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!onUpdateAccountSettings) return;
                  setIsSavingSettings(true);
                  setSaveResult(null);
                  try {
                    const payload: { token?: string; teamId?: string } = {
                      teamId: teamIdInput.trim(),
                    };
                    if (newTokenInput.trim()) {
                      payload.token = newTokenInput.trim();
                    }
                    const res = await onUpdateAccountSettings(payload);
                    if (res.ok) {
                      setSaveResult({
                        ok: true,
                        message: "تنظیمات اکانت با موفقیت ذخیره شد.",
                      });
                      setNewTokenInput("");
                    } else {
                      setSaveResult({
                        ok: false,
                        message: res.error || "خطا در ذخیره‌سازی تنظیمات",
                      });
                    }
                  } catch (err: unknown) {
                    setSaveResult({
                      ok: false,
                      message: err instanceof Error ? err.message : "خطای ناشناخته در ذخیره‌سازی",
                    });
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings || isTestingConn}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 shadow-sm shadow-blue-900/30"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingSettings ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
