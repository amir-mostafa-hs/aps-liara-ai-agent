"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SidecarConsole, CloudService } from "@/components/console/SidecarConsole";
import { ChatMessageList, ChatMessage } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { SourceInputWidget } from "@/components/chat/SourceInputWidget";
import { TokenInputWidget } from "@/components/chat/TokenInputWidget";
import { PlanSelectorCard } from "@/components/chat/PlanSelectorCard";
import { AppTargetSelectorWidget } from "@/components/chat/AppTargetSelectorWidget";
import { DiffPreviewWidget } from "@/components/chat/DiffPreviewWidget";
import { DeployApprovalWidget } from "@/components/chat/DeployApprovalWidget";
import { RemediationApprovalWidget } from "@/components/chat/RemediationApprovalWidget";
import { EnvironmentPreflightWidget } from "@/components/chat/EnvironmentPreflightWidget";
import { createLiaraApp } from "@/lib/app-creation-workflow";
import { runPostDeployCheck, updateChatMessage } from "@/lib/post-deploy-status";
import { formatPlanPrice } from "@/lib/app-preflight";
import { redactChatText } from "@/lib/chat-history";

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
  const [accountSettings, setAccountSettings] = useState<{
    configured: boolean;
    maskedToken: string;
    teamId: string;
    teams?: Array<{ id: string; name: string }>;
  }>({
    configured: false,
    maskedToken: "",
    teamId: "",
    teams: [],
  });


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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sidecar & Infrastructure State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[AGENT] آماده دریافت درخواست‌های دپلوی و تحلیل کدبیس...",
  ]);
  const [services, setServices] = useState<CloudService[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const pendingEnvValuesRef = useRef<Map<string, Record<string, string>>>(new Map());
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
          return prev;
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

  const fetchAccountSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/liara-token");
      if (res.ok) {
        const data = await res.json();
        setAccountSettings((prev) => ({
          ...prev,
          configured: Boolean(data.configured),
          maskedToken: data.maskedToken || "",
          teamId: data.teamId || "",
        }));
        if (data.teamId) {
          setActiveTeam({ id: data.teamId, name: "تیم فعال" });
        } else {
          setActiveTeam(null);
        }
      }
    } catch {}
  }, []);

  const handleUpdateAccountSettings = async (payload: { token?: string; teamId?: string }) => {
    try {
      const res = await fetch("/api/settings/liara-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "خطا در ذخیره‌سازی تنظیمات" };
      }
      setAccountSettings((prev) => ({
        ...prev,
        configured: Boolean(data.configured),
        maskedToken: data.maskedToken || prev.maskedToken,
        teamId: data.teamId !== undefined ? data.teamId : prev.teamId,
      }));
      if (data.teamId) {
        setActiveTeam({ id: data.teamId, name: "تیم فعال" });
      } else {
        setActiveTeam(null);
      }
      fetchLiveServices();
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const handleTestConnection = async (payload?: { api_token?: string; team_id?: string }) => {
    try {
      const res = await fetch("/api/liara/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (Array.isArray(data.teams)) {
          setAccountSettings((prev) => ({
            ...prev,
            teams: data.teams,
          }));
        }
        return { ok: true, teams: data.teams };
      }
      return { ok: false, error: data.error || "خطا در تست اتصال به لیارا" };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  // Check auth and initial status on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/login");
        } else {
          setUser(data);
          fetch("/api/conversations")
            .then((response) => response.json())
            .then(async (chatData) => {
              if (chatData.ok && chatData.activeConversation) {
                const active = chatData.activeConversation;
                setConversationId(active.id);
                const saved = Array.isArray(active.messages) ? active.messages : [];
                if (saved.length) {
                  setMessages(saved.map((item: any) => {
                    const inspection = item.metadata?.tool_results?.find((tool: any) => tool.name === "inspect_project" && tool.result?.ok);
                    const analysis = inspection?.result?.analysis;
                    return {
                      id: item.id,
                      role: item.role,
                      content: item.content,
                      timestamp: item.createdAt,
                      widget: analysis ? {
                        type: "app_target_selector",
                        data: { sourcePath: inspection.result.source_path, analysis, suggestedAppName: analysis.suggested_app_name, detectedPlatform: analysis.detected_platform },
                      } : undefined,
                    };
                  }));
                }
                return;
              }
              const created = await fetch("/api/conversations", { method: "POST" }).then((response) => response.json());
              if (created.ok && created.conversation?.id) setConversationId(created.conversation.id);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Initial and periodic system health check
    checkSystemHealth();
    const healthInterval = setInterval(checkSystemHealth, 30000);

    // Initial and periodic cloud services check
    fetchLiveServices();
    const servicesInterval = setInterval(fetchLiveServices, 60000);

    // Fetch team and account settings
    fetchAccountSettings();

    return () => {
      clearInterval(healthInterval);
      clearInterval(servicesInterval);
    };
  }, [router, checkSystemHealth, fetchLiveServices, fetchAccountSettings]);

  const continueToDiffPreview = (targetApp: string, sourcePath: string, analysis: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMsgId("ast"),
        role: "assistant",
        content: `تنظیم متغیرهای اجرای برنامه برای **${targetApp}** تأیید شد. پیش‌نمایش تغییرات فایل پیکربندی را بررسی کنید:`,
        timestamp: new Date().toISOString(),
        widget: { type: "diff_preview", data: { sourcePath, targetApp, analysis } },
      },
    ]);
  };

  const startEnvironmentPreflight = (targetApp: string, sourcePath: string, analysis: any) => {
    const inspectedRequirements = analysis?.env_requirements || (analysis?.required_env_names || []).map((name: string) => ({
      name,
      evidence: [],
      required: name !== "PORT",
      sensitive: /secret|password|token|key|credential/i.test(name),
      value_source: name === "PORT" ? "platform_provided" : "unresolved",
      example_is_placeholder: false,
    }));
    const serviceValues = pendingEnvValuesRef.current.get(targetApp) || {};
    const knownNames = new Set(inspectedRequirements.map((item: any) => item.name));
    const requirements = [
      ...inspectedRequirements,
      ...Object.keys(serviceValues).filter((name) => !knownNames.has(name)).map((name) => ({
        name,
        evidence: ["سرویس تأییدشدهٔ لیارا"],
        required: true,
        sensitive: true,
        value_source: "liara_service",
        example_is_placeholder: false,
      })),
    ];
    setMessages((prev) => [
      ...prev,
      {
        id: createMsgId("ast"),
        role: "assistant",
        content: `پیش از دپلوی، متغیرهای لازم برنامهٔ **${targetApp}** را بررسی می‌کنیم. مقدارها فقط پس از تأیید شما روی لیارا ثبت می‌شوند.`,
        timestamp: new Date().toISOString(),
        widget: { type: "env_preflight", data: { appName: targetApp, sourcePath, analysis, requirements } },
      },
    ]);
  };

  // Helper to advance to Database selection or environment preflight
  const proceedToDatabaseOrDiff = (
    targetApp: string,
    sourcePath: string,
    analysis: any
  ) => {
    if (analysis?.detected_databases && analysis.detected_databases.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId("ast"),
          role: "assistant",
          content: `سرویس مقصد **«${targetApp}»** تعیین شد.\n\nپروژه شما نیاز به پایگاه‌داده (${analysis.detected_databases
            .map((d: any) => d.db_type)
            .join("، ")}) دارد. لطفاً پلن دیتابیس را انتخاب فرمایید:`,
          timestamp: new Date().toISOString(),
          widget: {
            type: "plan_selector",
            data: {
              databases: analysis.detected_databases,
              sourcePath,
              analysis,
              targetApp,
            },
          },
        },
      ]);
    } else {
      startEnvironmentPreflight(targetApp, sourcePath, analysis);
    }
  };

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

      // Check if project already has liara.json with a valid existing app in cloud
      const hasPreconfiguredApp = Boolean(
        analysis.has_liara_json &&
        analysis.existing_app_name &&
        services.some((s) => s.type === "app" && s.name === analysis.existing_app_name)
      );

      if (hasPreconfiguredApp) {
        const targetAppName = analysis.existing_app_name;
        setSelectedApp(targetAppName);
        setTerminalLogs((prev) => [
          ...prev,
          `✔ سرویس ابری منطبق با liara.json در اکانت یافت شد: ${targetAppName}`,
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: createMsgId("ast"),
            role: "assistant",
            content: `${
              analysis.persian_summary ||
              `سورس‌کد با موفقیت تحلیل شد! 🔍\n\n• پلتفرم: **${analysis.detected_platform}**\n• پورت ارتباطی: **${analysis.port}**\n• اسکریپت راه‌اندازی: \`${
                analysis.start_command || "node server.js"
              }\``
            }${dbInfoText}\n\nسرویس ابری **«${targetAppName}»** مطابق با فایل liara.json پروژه در اکانت شما آماده دریافت دپلوی است.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        proceedToDatabaseOrDiff(targetAppName, sourcePath, analysis);
      } else {
        const appExplanation = analysis.has_liara_json && analysis.existing_app_name
          ? `برنامه «${analysis.existing_app_name}» در فایل liara.json تعریف شده، اما هنوز در اکانت لیارای شما فعال نیست.`
          : `در فایل‌های پروژه کانفیگ اختصاصی liara.json برای اتصال به یک برنامه مشخص یافت نشد.`;

        setMessages((prev) => [
          ...prev,
          {
            id: createMsgId("ast"),
            role: "assistant",
            content: `${
              analysis.persian_summary ||
              `سورس‌کد با موفقیت تحلیل شد! 🔍\n\n• پلتفرم: **${analysis.detected_platform}**\n• پورت ارتباطی: **${analysis.port}**\n• اسکریپت راه‌اندازی: \`${
                analysis.start_command || "node server.js"
              }\``
            }${dbInfoText}\n\n${appExplanation}\nپیش از ایجاد کانفیگ و انجام دپلوی، لطفاً سرویس مقصد در لیارا را مشخص کنید:`,
            timestamp: new Date().toISOString(),
            widget: {
              type: "app_target_selector",
              data: {
                suggestedAppName: analysis.existing_app_name || analysis.suggested_app_name || "my-app",
                detectedPlatform: analysis.detected_platform || "node",
                existingApps: services.filter((s) => s.type === "app"),
                sourcePath,
                analysis,
              },
            },
          },
        ]);
      }
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
    if (widget.type === "app_target_selector") {
      const data = widget.data || {};
      const sourcePath = data.sourcePath;
      const analysis = data.analysis;

      return (
        <AppTargetSelectorWidget
          suggestedAppName={data.suggestedAppName}
          detectedPlatform={data.detectedPlatform}
          detectedDatabaseCount={analysis?.detected_databases?.length || 0}
          teamScope={activeTeam}
          existingApps={data.existingApps || services.filter((s: CloudService) => s.type === "app")}
          onSelectExistingApp={(chosenAppName) => {
            setSelectedApp(chosenAppName);
            setTerminalLogs((prev) => [
              ...prev,
              `✔ سرویس موجود «${chosenAppName}» به عنوان مقصد دپلوی انتخاب شد.`,
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: createMsgId("usr"),
                role: "user",
                content: `سرویس موجود «${chosenAppName}» را به عنوان مقصد انتخاب کردم.`,
                timestamp: new Date().toISOString(),
              },
            ]);
            proceedToDatabaseOrDiff(chosenAppName, sourcePath, analysis);
          }}
          onCreateNewApp={async (creation) => {
            const { appName, planId, bundlePlanId, networkId, priceMonthly, bundlePriceMonthly } = creation;
            return createLiaraApp(
              { ...creation, platform: data.detectedPlatform || "node" },
              {
                onConfirmed: (service) => {
                  setSelectedApp(appName);
                  setServices((prev) => [
                    ...prev,
                    {
                      name: appName,
                      type: "app",
                      status: String(service.status),
                      endpoint: String(service.endpoint || `https://${appName}.liara.run`),
                      port: analysis?.port || 3000,
                    },
                  ]);
                  setTerminalLogs((prev) => [
                    ...prev,
                      `✔ سرویس ابری «${appName}» با پلن ${planId}، امکانات ${bundlePlanId} و شبکهٔ انتخاب‌شده در لیارا ایجاد و تأیید شد.`,
                  ]);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: createMsgId("ast"),
                      role: "assistant",
                      content: `سرویس **${appName}** با پلتفرم **${creation.platform}**، پلن **${planId}**، امکانات **${bundlePlanId}** و شبکهٔ انتخاب‌شده در لیارا ساخته و تأیید شد. قیمت‌های تأییدشده: پلن سخت‌افزاری ${formatPlanPrice(priceMonthly)} و امکانات ${formatPlanPrice(bundlePriceMonthly)}. حالا آمادهٔ ادامهٔ دپلوی هستیم.`,
                      timestamp: new Date().toISOString(),
                    },
                  ]);

                  fetchLiveServices();
                  proceedToDatabaseOrDiff(appName, sourcePath, analysis);
                },
              },
            );
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "plan_selector") {
      return (
        <PlanSelectorCard
          databases={widget.data?.databases || []}
          onDatabaseCreated={(dbInfo) => {
            const targetApp = widget.data?.targetApp || selectedApp;
            pendingEnvValuesRef.current.set(targetApp, dbInfo.suggested_env_vars || {});
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
              `✔ ${Object.keys(dbInfo.suggested_env_vars || {}).length} متغیر اتصال از سرویس تأییدشده دریافت شد.`,
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: createMsgId("ast"),
                role: "assistant",
                content: `پایگاه‌داده **${dbInfo.db_name}** (${dbInfo.db_type}) با موفقیت روی لیارا ایجاد شد! 🎉\n\nمتغیرهای اتصال از سرویس دریافت شده‌اند. پیش از دپلوی، آن‌ها و سایر مقدارهای لازم با تأیید شما روی سرویس برنامه ثبت می‌شوند.`,
                timestamp: new Date().toISOString(),
                widget: undefined,
              },
            ]);
            startEnvironmentPreflight(targetApp, widget.data?.sourcePath, widget.data?.analysis);
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "env_preflight") {
      const appName = widget.data?.appName || selectedApp;
      const values = pendingEnvValuesRef.current.get(appName) || {};
      return (
        <EnvironmentPreflightWidget
          appName={appName}
          requirements={widget.data?.requirements || []}
          serviceValues={values}
          onResolved={() => {
            pendingEnvValuesRef.current.delete(appName);
            continueToDiffPreview(appName, widget.data?.sourcePath, widget.data?.analysis);
          }}
          disabled={isStreaming}
        />
      );
    }
    if (widget.type === "diff_preview") {
      const sourcePath = widget.data?.sourcePath;
      const analysis = widget.data?.analysis;
      const platform = analysis?.detected_platform || "nodejs";
      const port = analysis?.port || 3000;
      const startCommand = analysis?.start_command || undefined;
      const defaultName = sourcePath
        ? sourcePath.split("/").filter(Boolean).pop() || "demo-app"
        : "demo-app";
      const appName = widget.data?.targetApp || selectedApp || defaultName;

      return (
        <DiffPreviewWidget
          sourcePath={sourcePath}
          appName={appName}
          platform={platform}
          port={port}
          startCommand={startCommand}
          envVars={{}}
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

              let progressMessageId: string | null = null;
              try {
                const { progressMessage, result } = await runPostDeployCheck(
                  runId,
                  (message) => {
                    progressMessageId = message.id;
                    setMessages((prev) => [...prev, message]);
                  },
                );

                const providerSummary = `• وضعیت دپلوی: **${result.provider_deployment_state === "succeeded" ? "موفق" : result.provider_deployment_state}**` +
                  (result.provider_release_state ? `\n• وضعیت release در Liara: **${result.provider_release_state}**` : "") +
                  (result.provider_release_warning ? `\n• بررسی release: ${result.provider_release_warning}` : "");
                const runtimeLines = typeof result.runtime_logs === "string" ? result.runtime_logs.split("\n").filter(Boolean) : [];
                if (result.runtime_logs_status === "available") {
                  setTerminalLogs((prev) => [...prev, "[RUNTIME LOGS]", ...runtimeLines]);
                }

                if (result.application_health === "healthy") {
                  let runtimeSummary = "";
                  if (result.runtime_logs_status === "available") {
                    const highlights = runtimeLines.filter((line: string) => /listen|started|healthy|error|warning/i.test(line)).slice(-5);
                    runtimeSummary = `\n• لاگ runtime: از Liara دریافت شد (${runtimeLines.length} خط)${highlights.length ? `\n• نکته‌ها: ${highlights.join(" | ")}` : ""}`;
                  } else {
                    runtimeSummary = `\n• سایت سالم است، اما لاگ runtime پس از ${result.attempts} تلاش دریافت نشد.${result.runtime_logs_warning ? `\n• جزئیات: ${result.runtime_logs_warning}` : ""}`;
                  }
                  setMessages((prev) => updateChatMessage(prev, progressMessage.id, {
                      content: `🎉 **دپلوی انجام شد و برنامه در دسترس است.**\n\n${providerSummary}\n• بررسی سلامت برنامه: **سالم (HTTP ${result.http_status_code})**\n• آدرس عمومی سرویس: [${result.endpoint_url}](${result.endpoint_url})\n• مدت پایش: ${result.elapsed_seconds} ثانیه${runtimeSummary}`,
                      timestamp: new Date().toISOString(),
                  }));
                } else {
                  setTerminalLogs((prev) => [
                    ...prev,
                    `✖ بررسی سلامت برنامه موفق نبود (HTTP ${result.http_status_code || "نامشخص"}). لاگ runtime پس از ${result.attempts} تلاش بررسی شد.`,
                  ]);
                  const diagnosis = result.diagnosis;
                  if (!diagnosis) throw new Error("تشخیص بر پایهٔ شواهد runtime دریافت نشد.");
                  const conclusive = diagnosis?.diagnosis_status !== "inconclusive";
                  const canRemediate = conclusive && Boolean(diagnosis?.missing_variable);
                  const logSourceLabel = result.log_source === "runtime" ? "لاگ اجرای برنامه" : "لاگ اجرایی در دسترس نبود";

                  setMessages((prev) => updateChatMessage(prev, progressMessage.id, {
                      content: `⚠️ دپلوی در Liara انجام شد، اما برنامه سالم نیست.\n\n${providerSummary}\n• وضعیت HTTP: **${result.http_status_code || "نامشخص"}**\n• منبع تشخیص: **${logSourceLabel}**\n\n${conclusive ? "علت بر اساس شواهد زیر تشخیص داده شد:" : "تشخیص قطعی ممکن نشد:"}\n\n**${diagnosis?.root_cause || "اطلاعات کافی برای تشخیص علت در دسترس نیست."}**${result.runtime_logs_warning ? `\n\n⚠️ وضعیت لاگ runtime: ${result.runtime_logs_warning}` : ""}${canRemediate ? "\n\nراهکار پیشنهادی در ادامه برای تأیید شما نمایش داده شده است:" : !conclusive ? "\n\nشواهد کافی برای تشخیص قطعی وجود ندارد. هیچ تغییری در سرویس اعمال نشده است." : "\n\nبرای این علت، اقدامی به‌صورت خودکار انجام نمی‌شود. راهنمایی بالا را دنبال کنید."}`,
                      timestamp: new Date().toISOString(),
                      widget: canRemediate ? {
                        type: "remediation_approval",
                        data: { runId, targetApp, diagnosis },
                      } : undefined,
                  }));
                }
              } catch (err: unknown) {
                const detail = "دریافت نتیجهٔ بررسی سلامت یا لاگ‌های اجرای برنامه ناموفق بود.";
                setTerminalLogs((prev) => [...prev, `⚠️ بررسی سلامت یا لاگ‌های برنامه کامل نشد: ${detail}`]);
                const failureMessage = {
                    role: "assistant" as const,
                    content: `دپلوی از طرف لیارا موفق گزارش شد، اما بررسی سلامت یا لاگ‌های runtime کامل نشد: ${detail}\n\nآدرس برنامه را می‌توانید جداگانه بررسی کنید.`,
                    timestamp: new Date().toISOString(),
                };
                if (progressMessageId) {
                  setMessages((prev) => updateChatMessage(prev, progressMessageId!, failureMessage));
                } else {
                  setMessages((prev) => [...prev, { id: createMsgId("ast"), ...failureMessage }]);
                }
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
                if (!diagRes.ok || !diagData.ok || !diagData.diagnosis) {
                  throw new Error(diagData.error || "تحلیل لاگ‌های دپلوی کامل نشد.");
                }
                const diagnosis = diagData.diagnosis;
                const conclusive = diagnosis?.diagnosis_status !== "inconclusive";
                const canRemediate = conclusive && Boolean(diagnosis?.missing_variable);

                setMessages((prev) => [
                  ...prev,
                  {
                    id: createMsgId("ast"),
                    role: "assistant",
                    content: `⚠️ فرآیند دپلوی با خطا متوقف شد.\n\n${conclusive ? "علت بر اساس لاگ‌های دپلوی تشخیص داده شد:" : "تشخیص قطعی ممکن نشد:"}\n\n**${
                      diagnosis?.root_cause || "اطلاعات کافی برای تشخیص علت در دسترس نیست."
                    }**${canRemediate ? "\n\nراهکار پیشنهادی در ادامه برای تأیید شما نمایش داده شده است:" : !conclusive ? "\n\nهیچ تغییری اعمال نشده است. لطفاً لاگ‌ها یا تنظیمات پروژه را بررسی کنید." : "\n\nبرای این علت، اقدامی به‌صورت خودکار انجام نمی‌شود. راهنمایی بالا را دنبال کنید."}`,
                    timestamp: new Date().toISOString(),
                    widget: canRemediate ? {
                      type: "remediation_approval",
                      data: {
                        runId,
                        targetApp,
                        diagnosis,
                      },
                    } : undefined,
                  },
                ]);
              } catch (err: unknown) {
                const detail = "ارتباط با سرویس تحلیل خطا برقرار نشد.";
                setTerminalLogs((prev) => [...prev, `⚠️ دریافت تشخیص SRE کامل نشد: ${detail}`]);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: createMsgId("ast"),
                    role: "assistant",
                    content: `دپلوی ناموفق بود و تحلیل خودکار لاگ‌ها هم کامل نشد: ${detail}\n\nلاگ‌های دپلوی در پنل کنسول باقی مانده‌اند تا بتوانید آن‌ها را بررسی یا برای تلاش دوباره استفاده کنید.`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
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
          missingVariable={diagnosis?.missing_variable || (diagnosis?.remediation?.operation === "set_env" ? diagnosis?.remediation?.env_variable : undefined)}
          suggestedValue={diagnosis?.remediation?.operation === "set_env" ? diagnosis?.remediation?.env_value || "" : ""}
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
    const displayedText = redactChatText(text);
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: displayedText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setTerminalLogs((prev) => [...prev, "[AGENT] درخواست جدید در حال تحلیل است..."]);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const createResponse = await fetch("/api/conversations", { method: "POST" });
        const createData = await createResponse.json();
        if (!createResponse.ok || !createData.ok || !createData.conversation?.id) {
          throw new Error(createData.error || "گفت‌وگوی فعال ساخته نشد.");
        }
        activeConversationId = createData.conversation.id;
        setConversationId(activeConversationId);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, message: text }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.message) {
        throw new Error(data.error || "پاسخ Agent دریافت نشد.");
      }

      const toolResults = Array.isArray(data.toolResults) ? data.toolResults : [];
      const inspection = [...toolResults].reverse().find((tool: any) => tool.name === "inspect_project" && tool.result?.ok);
      const analysis = inspection?.result?.analysis;
      const toolLabels: Record<string, string> = {
        inspect_project: "بررسی پروژه",
        list_liara_apps: "فهرست اپلیکیشن‌ها",
        get_liara_app_details: "جزئیات اپلیکیشن",
        get_liara_app_logs: "لاگ‌های اپلیکیشن",
        get_liara_app_releases: "نسخه‌های منتشرشده",
        get_liara_app_events: "رویدادهای اپلیکیشن",
        list_liara_databases: "فهرست دیتابیس‌ها",
        list_liara_buckets: "فهرست مخزن‌های Object Storage",
        list_liara_dns_zones: "فهرست دامنه‌های DNS",
        list_liara_mail_servers: "فهرست سرویس‌های Mail",
      };
      for (const tool of toolResults) {
        setTerminalLogs((prev) => [...prev, `[ابزار] ${toolLabels[tool.name] || "عملیات Liara"}: ${tool.result?.ok ? "انجام شد" : "ناموفق"}`]);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id || createMsgId("ast"),
          role: "assistant",
          content: data.message.content,
          timestamp: data.message.createdAt || new Date().toISOString(),
          widget: analysis ? {
            type: "app_target_selector",
            data: {
              sourcePath: inspection.result.source_path,
              analysis,
              suggestedAppName: analysis.suggested_app_name,
              detectedPlatform: analysis.detected_platform,
            },
          } : undefined,
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId("err"),
          role: "assistant",
          content: "در پردازش درخواست مشکلی پیش آمد. لطفاً اتصال را بررسی کنید و دوباره تلاش کنید.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
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
    <div className="flex flex-col h-full w-full bg-[#0c0c0e] bg-grid text-zinc-200 overflow-hidden">
      {/* Top Header */}
      <Header
        username={user.username}
        activeTeam={activeTeam}
        onLogout={handleLogout}
        systemConnected={systemConnected}
      />

      {/* Main Dual Workspace Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Chat Space */}
        <section className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            renderWidget={renderWidget}
            onStartDeploy={() => handleSendMessage("می‌خواهم پروژه sample-apps/nodejs-demo را روی لیارا دیپلوی کنم.")}
            onShowGuide={() => handleSendMessage("راهنمای گام‌به‌گام دپلوی و قابلیت‌های ایجنت هوشمند را توضیح بده.")}
            onSelectPrompt={handleSendMessage}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isStreaming}
          />
        </section>

        {/* Sidecar Console (Terminal, Services & Health) */}
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
          accountSettings={accountSettings}
          onUpdateAccountSettings={handleUpdateAccountSettings}
          onTestConnection={handleTestConnection}
        />
      </div>
    </div>
  );
}
