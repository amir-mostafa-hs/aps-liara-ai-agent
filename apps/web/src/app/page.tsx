"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SidecarConsole, CloudService } from "@/components/console/SidecarConsole";
import { ChatMessageList, ChatMessage } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { SourceInputWidget } from "@/components/chat/SourceInputWidget";

export default function HomePage() {
  const router = useRouter();

  // Operator and Session State
  const [user, setUser] = useState<{ authenticated: boolean; username?: string }>({
    authenticated: true,
    username: "admin",
  });
  const [activeTeam, setActiveTeam] = useState<{ id: string; name: string } | null>({
    id: "6ace4ec3ec13fe0c3c19c4db",
    name: "لیارا",
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
  const [isStreaming, setIsStreaming] = useState(false);

  // Sidecar & Infrastructure State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[AGENT] آماده دریافت درخواست‌های دپلوی و تحلیل کدبیس...",
  ]);
  const [services, setServices] = useState<CloudService[]>([
    {
      name: "aps-test",
      type: "app",
      status: "running",
      endpoint: "https://aps-test.liara.run",
      port: 3000,
    },
  ]);
  const [systemConnected, setSystemConnected] = useState(true);

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

    // Check system health
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") {
          setSystemConnected(true);
        }
      })
      .catch(() => setSystemConnected(false));
  }, [router]);

  // Handle Source Ingestion from Widget
  const handleSourceIngested = async (sourcePath: string, type: string) => {
    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
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
      setTerminalLogs((prev) => [
        ...prev,
        `✔ پلتفرم شناسایی‌شده: ${analysis.detected_platform}`,
        `✔ پورت: ${analysis.port}`,
        `✔ اسکریپت اجرا: ${analysis.start_command}`,
      ]);

      setMessages((prev) => [
        ...prev,
        {
          id: "ast-" + Date.now(),
          role: "assistant",
          content: `سورس‌کد با موفقیت تحلیل شد! 🔍\n\n• پلتفرم: **${analysis.detected_platform}** (ضریب اطمینان ${Math.round(
            (analysis.confidence || 1) * 100
          )}٪)\n• پورت ارتباطی: **${analysis.port}**\n• اسکریپت راه‌اندازی: \`${
            analysis.start_command || "node server.js"
          }\`\n• فایل‌های کلیدی: \`${analysis.evidence_files?.join("`, `") || ""}\`\n\nسیستم آمادهٔ ساخت سرویس‌ها و انجام دپلوی است.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
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
    return null;
  };

  // Handle User Message in Chat
  const handleSendMessage = async (text: string) => {
    const userMessageId = "usr-" + Date.now();
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

      // If user provided a path or requested deployment of sample app
      if (text.includes("sample-apps/nodejs-demo") || text.includes("پروژه نمونه")) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "ast-" + Date.now(),
              role: "assistant",
              content:
                "پروژه نمونه `sample-apps/nodejs-demo` دریافت شد.\n\nدر حال بررسی فایل‌های پروژه (package.json, liara.json, server.js) ...\n• پلتفرم شناسایی‌شده: **Node.js (node)**\n• پورت پیش‌فرض: **3000**\n• اسکریپت استارت: `node server.js`\n• نیازمندی‌های شناسایی‌شده: به متغیر محیطی `SERVICE_SECRET` و پایگاه داده نیاز دارد.\n\nآیا مایلید فایل تنظیمات `liara.json` را بررسی و دپلوی را آغاز کنیم؟",
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsStreaming(false);
          setTerminalLogs((prev) => [
            ...prev,
            "✔ آنالیز استاتیک پروژه با موفقیت انجام شد: Node.js روی پورت 3000",
          ]);
        }, 1200);
      } else if (text.includes("توکن") || text.includes("token")) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "ast-" + Date.now(),
              role: "assistant",
              content:
                "برای دریافت توکن دسترسی لیارا، کافی است وارد کنسول کاربری خود در لیارا (console.liara.ir) شوید، از منوی پروفایل به بخش **«دسترسی به API»** رفته و یک کلید دسترسی جدید ایجاد کنید.\n\nمی‌توانید توکن خود را در فرم ورود امن ثبت کنید تا به صورت خودکار و بدون ارسال به مدل هوش مصنوعی در پروفایل شما ذخیره شود.",
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsStreaming(false);
        }, 1000);
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "ast-" + Date.now(),
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
          id: "err-" + Date.now(),
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidecar Console (Terminal, Services & Status) */}
        <SidecarConsole
          logs={terminalLogs}
          services={services}
          onClearLogs={handleClearLogs}
          isStreaming={isStreaming}
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
