"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SidecarConsole, CloudService } from "@/components/console/SidecarConsole";
import { ChatMessageList, ChatMessage } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { SourceInputWidget } from "@/components/chat/SourceInputWidget";
import { TokenInputWidget } from "@/components/chat/TokenInputWidget";
import { PlanSelectorCard } from "@/components/chat/PlanSelectorCard";
import { DiffPreviewWidget } from "@/components/chat/DiffPreviewWidget";
import { DeployApprovalWidget } from "@/components/chat/DeployApprovalWidget";
import { RemediationApprovalWidget } from "@/components/chat/RemediationApprovalWidget";

let messageSequence = 0;
function createMsgId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${Date.now()}-${messageSequence}-${Math.random().toString(36).substring(2, 6)}`;
}

export default function HomePage() {
  const router = useRouter();

  // Operator and Session State
  const [user, setUser] = useState<{ authenticated: boolean; username?: string }>({
    authenticated: true,
    username: "admin",
  });
  const [activeTeam, setActiveTeam] = useState<{ id: string; name: string } | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "سلام! من ایجنت هوشمند و خودکار دپلوی و مهندسی قابلیت اطمینان (SRE) لیارا هستم.\n\nمن می‌تونم سورس‌کد پروژه شما رو بررسی کنم، پلتفرم و پیش‌نیازهایی مثل دیتابیس (پستگرس، ردیس، مای‌اس‌کیو‌ال و ...) رو تشخیص بدم، در صورت تمایل سرویس‌ها رو در لیارا براتون بسازم، فایل liara.json رو تولید کنم و پروژه رو دپلوی کنم.\n\nبرای شروع، لطفاً سورس پروژه را با یکی از روش‌های زیر مشخص کنید:",
      timestamp: new Date().toISOString(),
      widget: {
        type: "source_input",
      },
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sidecar & Infrastructure State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[AGENT] آماده دریافت درخواست‌های دپلوی و تحلیل کدبیس...",
  ]);
  const [services, setServices] = useState<CloudService[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [isRefreshingServices, setIsRefreshingServices] = useState(false);
  const [systemConnected, setSystemConnected] = useState(true);
  const [systemHealth, setSystemHealth] = useState({ database: true, engine: true });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  const fetchLiveServices = useCallback(async () => {
    setIsRefreshingServices(true);
    try {
      const res = await fetch("/api/liara/services");
      const data = await res.json();
      if (data.ok && Array.isArray(data.services)) {
        setServices(data.services);
        setSelectedApp((prev) => {
          if (prev && data.services.some((s: CloudService) => s.type === "app" && s.name === prev)) {
            return prev;
          }
          const firstApp = data.services.find((s: CloudService) => s.type === "app");
          return firstApp ? firstApp.name : prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch live services:", err);
    } finally {
      setIsRefreshingServices(false);
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    setIsRefreshingHealth(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      const dbConnected = data.database?.status === "connected";
      const engineHealthy = data.engine?.status === "healthy";
      setSystemHealth({
        database: Boolean(dbConnected),
        engine: Boolean(engineHealthy),
      });
      setSystemConnected(Boolean(dbConnected && engineHealthy));
    } catch {
      setSystemHealth({ database: false, engine: false });
      setSystemConnected(false);
    } finally {
      setIsRefreshingHealth(false);
    }
  }, []);

  // Check auth and initial status on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/login");
        } else {
          setUser(data);
        }
      })
      .catch(() => {});

    // Initial and periodic system health check
    checkSystemHealth();
    const healthInterval = setInterval(checkSystemHealth, 30000);

    // Initial and periodic cloud services check
    fetchLiveServices();
    const servicesInterval = setInterval(fetchLiveServices, 60000);

    // Fetch team settings
    fetch("/api/settings/liara-token")
      .then((res) => res.json())
      .then((data) => {
        if (data.teamId) {
          setActiveTeam({ id: data.teamId, name: "تیم فعال" });
        }
      })
      .catch(() => {});

    return () => {
      clearInterval(healthInterval);
      clearInterval(servicesInterval);
    };
  }, [router, checkSystemHealth, fetchLiveServices]);

  // Handle Source Ingestion from Widget
  const handleSourceIngested = async (sourcePath: string, type: string) => {
    const userMsg: ChatMessage = {
      id: createMsgId("usr"),
      role: "user",
      content: `پروژه از طریق ${
        type === "zip" ? "فایل ZIP" : type === "git" ? "ریپازیتوری Git" : "مسیر محلی"
      } با آدرس \`${sourcePath}\` انتخاب شد.`,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setTerminalLogs((prev) => [
      ...prev,
      `[AGENT] تحلیل استاتیک سورس‌کد از مسیر: ${sourcePath}...`,
    ]);

    try {
      const res = await fetch("/api/project/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: sourcePath }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const analysis = data.analysis;
      const dbLogs = (analysis.detected_databases || []).map(
        (db: any) => `✔ پایگاه‌داده شناسایی‌شده: ${db.db_type} (${db.driver_or_orm})`
      );

      setTerminalLogs((prev) => [
        ...prev,
        `✔ پلتفرم شناسایی‌شده: ${analysis.detected_platform}`,
        `✔ پورت: ${analysis.port}`,
        `✔ اسکریپت اجرا: ${analysis.start_command || "node server.js"}`,
        ...dbLogs,
      ]);

      const dbInfoText =
        analysis.detected_databases && analysis.detected_databases.length > 0
          ? `\n\n🗄️ **پایگاه‌داده‌های شناسایی‌شده:**\n` +
            analysis.detected_databases
              .map(
                (db: any) =>
                  `• **${db.db_type}** (${db.driver_or_orm}) - پورت ${db.default_port} - متغیرهای پیشنهادی: \`${(db.suggested_env_vars || []).join("`, `")}\``
              )
              .join("\n")
          : "";

      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId("ast"),
          role: "assistant",
          content: `${
            analysis.persian_summary ||
            `سورس‌کد با موفقیت تحلیل شد! 🔍\n\n• پلتفرم: **${analysis.detected_platform}** (ضریب اطمینان ${Math.round(
              (analysis.confidence || 1) * 100
            )}٪)\n• پورت ارتباطی: **${analysis.port}**\n• اسکریپت راه‌اندازی: \`${
              analysis.start_command || "node server.js"
            }\`\n• فایل‌های کلیدی: \`${analysis.evidence_files?.join("`, `") || ""}\``
          }${dbInfoText}\n\nسیستم آمادهٔ ساخت سرویس‌ها و انجام دپلوی است.`,
          timestamp: new Date().toISOString(),
          widget:
            analysis.detected_databases && analysis.detected_databases.length > 0
              ? {
                  type: "plan_selector",
                  data: {
                    databases: analysis.detected_databases,
                    sourcePath,
                    analysis,
                  },
                }
              : {
                  type: "diff_preview",
                  data: {
                    sourcePath,
                    dbInfo: null,
                    analysis,
                  },
                },
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId("err"),
          role: "assistant",
          content: `خطا در تحلیل پروژه: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const renderWidget = (widget: { type: string; data?: any }) => {
    if (widget.type === "source_input") {
      return (
        <SourceInputWidget
          onSourceIngested={handleSourceIngested}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "token_input") {
      return (
        <TokenInputWidget
          onTokenSaved={(maskedToken) => {
            setTerminalLogs((prev) => [
              ...prev,
              `✔ کلید دسترسی لیارا در پروفایل ذخیره شد: ${maskedToken}`,
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: createMsgId("ast"),
                role: "assistant",
                content: `توکن شما با موفقیت ذخیره و اعتبارسنجی شد (${maskedToken}). اکنون می‌توانید سورس پروژه خود را برای دپلوی ارسال نمایید.`,
                timestamp: new Date().toISOString(),
                widget: { type: "source_input" },
              },
            ]);
          }}
        />
      );
    }
    if (widget.type === "plan_selector") {
      return (
        <PlanSelectorCard
          databases={widget.data?.databases || []}
          onDatabaseCreated={(dbInfo) => {
            setServices((prev) => [
              ...prev,
              {
                name: dbInfo.db_name,
                type: "database",
                status: "running",
                port: dbInfo.port,
              },
            ]);
            setTerminalLogs((prev) => [
              ...prev,
              `✔ سرویس دیتابیس ${dbInfo.db_name} (${dbInfo.db_type}) با موفقیت در لیارا ایجاد شد.`,
              `✔ پورت داخلی: ${dbInfo.port}`,
              `✔ متغیرهای اتصال: ${JSON.stringify(dbInfo.suggested_env_vars)}`,
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: createMsgId("ast"),
                role: "assistant",
                content: `پایگاه‌داده **${dbInfo.db_name}** (${dbInfo.db_type}) با موفقیت روی لیارا ایجاد شد! 🎉\n\nمتغیرهای محیطی اتصال:\n\`\`\`bash\n${Object.entries(
                  dbInfo.suggested_env_vars
                )
                  .map(([k, v]) => `${k}=${v}`)
                  .join("\n")}\n\`\`\`\nآیا مایلید این متغیرها به صورت خودکار به محیط ابری لیارا تزریق شوند و فایل \`liara.json\` تولید گردد؟`,
                timestamp: new Date().toISOString(),
                widget: {
                  type: "diff_preview",
                  data: {
                    dbInfo,
                    sourcePath: widget.data?.sourcePath,
                    analysis: widget.data?.analysis,
                  },
                },
              },
            ]);
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "diff_preview") {
      const dbInfo = widget.data?.dbInfo;
      const sourcePath = widget.data?.sourcePath;
      const analysis = widget.data?.analysis;
      const platform = analysis?.detected_platform || "nodejs";
      const port = analysis?.port || 3000;
      const startCommand = analysis?.start_command || undefined;
      const defaultName = sourcePath
        ? sourcePath.split("/").filter(Boolean).pop() || "demo-app"
        : "demo-app";
      const appName = selectedApp || defaultName;

      return (
        <DiffPreviewWidget
          sourcePath={sourcePath}
          appName={appName}
          platform={platform}
          port={port}
          startCommand={startCommand}
          envVars={dbInfo?.suggested_env_vars || {}}
          onApplied={async (result) => {
            setTerminalLogs((prev) => [
              ...prev,
              `✔ فایل‌های liara.json و .env با موفقیت به‌روزرسانی شدند: ${result.modifiedFiles.join(", ")}`,
            ]);

            setIsStreaming(true);
            try {
              const resRun = await fetch("/api/runs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sourcePath,
                  targetApp: appName,
                  port,
                }),
              });
              const runData = await resRun.json();
              if (!resRun.ok || !runData.ok) {
                throw new Error(runData.error || "خطا در ایجاد پلن دپلوی");
              }

              const run = runData.run;
              setMessages((prev) => [
                ...prev,
                {
                  id: createMsgId("ast"),
                  role: "assistant",
                  content: `فایل تنظیمات \`liara.json\` آماده شد و پلن دپلوی با شناسه \`${run.id.substring(
                    0,
                    12
                  )}...\` ایجاد گردید.\n\nبرای آغاز فرآیند استقرار در لیارا، لطفاً تأییدیه زیر را بررسی و صادر کنید:`,
                  timestamp: new Date().toISOString(),
                  widget: {
                    type: "deploy_approval",
                    data: {
                      runId: run.id,
                      targetApp: run.targetApp,
                      platform: run.platform,
                      port: run.port,
                      planDigest: run.planDigest,
                      sourcePath,
                      envVars: result.envVars,
                    },
                  },
                },
              ]);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              setMessages((prev) => [
                ...prev,
                {
                  id: createMsgId("err"),
                  role: "assistant",
                  content: `خطا در ایجاد پلن دپلوی: ${msg}`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            } finally {
              setIsStreaming(false);
            }
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "deploy_approval") {
      const { runId, targetApp, platform, port, planDigest } = widget.data || {};

      return (
        <DeployApprovalWidget
          runId={runId}
          targetApp={targetApp}
          platform={platform}
          port={port}
          planDigest={planDigest}
          onDeployStarted={() => {
            setTerminalLogs((prev) => [
              ...prev,
              `[DEPLOY] آغاز عملیات دپلوی برای ${targetApp} (Run ID: ${runId})...`,
            ]);
            // Inject cloud environment variables upon verified operator deploy approval
            if (widget.data?.envVars && Object.keys(widget.data.envVars).length > 0) {
              fetch("/api/liara/env/set", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  appName: targetApp,
                  envVars: widget.data.envVars,
                }),
              }).catch(console.error);
            }
          }}
          onStreamChunk={(chunk) => {
            setTerminalLogs((prev) => [...prev, chunk]);
          }}
          onDeployFinished={async (success, logs) => {
            if (success) {
              setTerminalLogs((prev) => [
                ...prev,
                `✔ عملیات استقرار با موفقیت به پایان رسید. در حال بررسی سلامت سرویس...`,
              ]);

              try {
                const verifyRes = await fetch(`/api/runs/${runId}/verify`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                });
                const verifyData = await verifyRes.json();
                const verification = verifyData.verification;

                if (verification?.application_health === "healthy") {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: createMsgId("ast"),
                      role: "assistant",
                      content: `🎉 **دپلوی با موفقیت کامل شد و برنامه در دسترس است!**\n\n• کد وضعیت HTTP: **${verification.http_status_code}**\n• آدرس عمومی سرویس: [${verification.endpoint_url}](${verification.endpoint_url})\n• وضعیت کلود: **سالم و فعال (Running)**`,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                } else {
                  setTerminalLogs((prev) => [
                    ...prev,
                    `✖ سرویس پاسخ ناموفق داد (HTTP ${verification?.http_status_code || "Unknown"}). آغاز ریشه‌یابی SRE...`,
                  ]);

                  const diagRes = await fetch(`/api/runs/${runId}/diagnose`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      logs: logs || "",
                      provider_status: "success",
                    }),
                  });
                  const diagData = await diagRes.json();
                  const diagnosis = diagData.diagnosis;

                  setMessages((prev) => [
                    ...prev,
                    {
                      id: createMsgId("ast"),
                      role: "assistant",
                      content: `⚠️ برنامه دپلوی شد، اما هنگام آزمایش سلامت پاسخ خطای ران‌تایم (کد ${
                        verification?.http_status_code || "503"
                      }) برگرداند.\n\nایجنت SRE لاگ‌ها را بررسی کرد و علت را تشخیص داد:\n\n**${
                        diagnosis?.root_cause || "خطای ران‌تایم در هنگام راه‌اندازی"
                      }**\n\nراهکار خودکار خودترمیمی آماده است:`,
                      timestamp: new Date().toISOString(),
                      widget: {
                        type: "remediation_approval",
                        data: {
                          runId,
                          targetApp,
                          diagnosis,
                        },
                      },
                    },
                  ]);
                }
              } catch (err: unknown) {
                console.error("Verification error:", err);
              }
            } else {
              setTerminalLogs((prev) => [
                ...prev,
                `✖ دپلوی با خطا مواجه شد. در حال استخراج و تحلیل علت خطا با ایجنت SRE...`,
              ]);

              try {
                const diagRes = await fetch(`/api/runs/${runId}/diagnose`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    logs: logs || "",
                    provider_status: "failed",
                  }),
                });
                const diagData = await diagRes.json();
                const diagnosis = diagData.diagnosis;

                setMessages((prev) => [
                  ...prev,
                  {
                    id: createMsgId("ast"),
                    role: "assistant",
                    content: `⚠️ فرآیند استقرار با خطا متوقف شد.\n\nتحلیل هوشمند ریشه خطا:\n\n**${
                      diagnosis?.root_cause || "خطای بیلد یا کامپایل در حین دپلوی"
                    }**\n\nراهکار پیشنهادی برای رفع مشکل:`,
                    timestamp: new Date().toISOString(),
                    widget: {
                      type: "remediation_approval",
                      data: {
                        runId,
                        targetApp,
                        diagnosis,
                      },
                    },
                  },
                ]);
              } catch (err: unknown) {
                console.error("Diagnosis on deploy failure error:", err);
              }
            }
          }}
          onReject={() => {
            setTerminalLogs((prev) => [
              ...prev,
              `ℹ اجرای دپلوی توسط اپراتور لغو شد.`,
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: createMsgId("ast"),
                role: "assistant",
                content: `اجرای دپلوی با تصمیم اپراتور لغو گردید. در صورت تمایل می‌توانید تغییرات پروژه را اصلاح کرده یا سورس دیگری را وارد نمایید.`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "remediation_approval") {
      const { runId, targetApp, diagnosis } = widget.data || {};

      return (
        <RemediationApprovalWidget
          runId={runId}
          targetApp={targetApp}
          rootCause={diagnosis?.root_cause || ""}
          errorEvidence={diagnosis?.error_evidence || ""}
          missingVariable={diagnosis?.missing_variable || "SERVICE_SECRET"}
          suggestedValue={diagnosis?.remediation?.env_value || "default-secret-key-123"}
          onRemediated={(res) => {
            if (res.isRecovered) {
              setTerminalLogs((prev) => [
                ...prev,
                `✔ متغیر اصلاحی با موفقیت به برنامه تزریق شد. سرویس مجدداً بررسی شد و اکنون سالم است.`,
              ]);
              setMessages((prev) => [
                ...prev,
                {
                  id: createMsgId("ast"),
                  role: "assistant",
                  content: `🎉 **خودترمیمی کامل شد!**\n\nمتغیر محیطی تزریق گردید و سرویس پس از راه‌اندازی مجدد، به وضعیت کاملاً سالم (Healthy) رسید.\n\nآدرس سرویس: [${res.verification?.endpoint_url}](${res.verification?.endpoint_url})`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          }}
          disabled={isStreaming}
        />
      );
    }
    return null;
  };

  // Handle User Message in Chat
  const handleSendMessage = async (text: string) => {
    const userMessageId = createMsgId("usr");
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Initial response logic / bridge to agent API
    try {
      // Stream terminal log announcement
      setTerminalLogs((prev) => [
        ...prev,
        `[AGENT] دریافت دستور جدید از کاربر: "${text}"`,
      ]);

      // If user requested analyzing or deploying sample app
      if (text.includes("sample-apps/nodejs-demo") || text.includes("پروژه نمونه")) {
        await handleSourceIngested("sample-apps/nodejs-demo", "path");
      } else if (text.includes("توکن") || text.includes("token")) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: createMsgId("ast"),
              role: "assistant",
              content:
                "برای اتصال به حساب لیارا، لطفاً کلید دسترسی (API Token) خود را در فرم امن زیر وارد کنید:",
              timestamp: new Date().toISOString(),
              widget: { type: "token_input" },
            },
          ]);
          setIsStreaming(false);
        }, 1000);
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: createMsgId("ast"),
              role: "assistant",
              content: `درخواست شما دریافت شد: «${text}».\n\nمن سورس‌کد و زیرساخت را طبق خواستهٔ شما پردازش می‌کنم. در صورتی که نیاز به ایجاد دیتابیس یا تنظیم مشخصات پلتفرم باشد، گزینه‌های لازم را به شما نشان خواهم داد.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsStreaming(false);
        }, 1200);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId("err"),
          role: "assistant",
          content: `خطا در برقراری ارتباط با موتور: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsStreaming(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {}
  };

  const handleClearLogs = () => {
    setTerminalLogs([]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <Header
        username={user.username}
        activeTeam={activeTeam}
        onLogout={handleLogout}
        systemConnected={systemConnected}
      />

      {/* Main Dual Workspace Area */}
      <div className="flex-1 flex flex-col-reverse lg:flex-row overflow-hidden relative">
        {/* Left Sidecar Console (Terminal, Services & Status) */}
        <SidecarConsole
          logs={terminalLogs}
          services={services}
          systemHealth={systemHealth}
          onClearLogs={handleClearLogs}
          isStreaming={isStreaming}
          onRefreshHealth={checkSystemHealth}
          isRefreshingHealth={isRefreshingHealth}
          onRefreshServices={fetchLiveServices}
          isRefreshingServices={isRefreshingServices}
          onSelectService={setSelectedApp}
          selectedServiceName={selectedApp}
        />

        {/* Right Chat Space */}
        <main className="flex-1 flex flex-col bg-zinc-950/40 relative overflow-hidden">
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            renderWidget={renderWidget}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isStreaming}
          />
        </main>
      </div>
    </div>
  );
}
