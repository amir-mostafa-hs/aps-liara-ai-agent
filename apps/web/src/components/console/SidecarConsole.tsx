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
} from "lucide-react";

export interface CloudService {
  name: string;
  type: string; // "app" | "postgres" | "mysql" | "redis" | "mongodb"
  status: string; // "running" | "deploying" | "failed" | "created"
  endpoint?: string;
  port?: number;
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
}

export function SidecarConsole({
  logs = [],
  services = [],
  systemHealth = { database: true, engine: true },
  onClearLogs,
  isStreaming = false,
}: SidecarProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "services" | "health">("terminal");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
      <aside className="w-12 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 shrink-0 transition-all select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="باز کردن کنسول جانبی"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
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
      </aside>
    );
  }

  return (
    <aside className="w-[42%] max-w-xl min-w-[340px] bg-zinc-900/95 border-r border-zinc-800 flex flex-col shrink-0 transition-all overflow-hidden">
      {/* Top Bar with Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "health"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>سلامت سیستم</span>
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
            <div className="text-xs font-semibold text-zinc-400 mb-1">سرویس‌های ابری در لیارا</div>
            {services.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                هنوز سرویسی ایجاد نشده است. با ارسال پروژه در چت، ایجنت دیتابیس و اپلیکیشن شما را خواهد ساخت.
              </div>
            ) : (
              services.map((svc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {svc.type === "app" ? (
                        <Globe className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Database className="h-4 w-4 text-emerald-400" />
                      )}
                      <span className="text-sm font-semibold text-zinc-200">{svc.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        svc.status === "running"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : svc.status === "failed"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {svc.status === "running"
                        ? "فعال و آنلاین"
                        : svc.status === "failed"
                        ? "خطا در اجرا"
                        : "در حال دپلوی"}
                    </span>
                  </div>
                  {svc.endpoint && (
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
                      <span className="text-[11px] text-zinc-500">دامنه دسترسی:</span>
                      <a
                        href={svc.endpoint}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:underline"
                        dir="ltr"
                      >
                        {svc.endpoint}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "health" && (
          <div className="h-full p-4 overflow-y-auto flex flex-col gap-3">
            <div className="text-xs font-semibold text-zinc-400 mb-1">وضعیت زیرساخت ایجنت</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">دیتابیس PostgreSQL (Prisma)</div>
                  <div className="text-[11px] text-zinc-500">ذخیره گزارش‌ها، تاییدها و نشست‌ها</div>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                متصل
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">موتور هوش مصنوعی (FastAPI & LangChain)</div>
                  <div className="text-[11px] text-zinc-500">تحلیل کدبیس و هماهنگ‌کننده دپلوی</div>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                متصل
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
