"use client";

import React, { useState } from "react";

interface DeployApprovalWidgetProps {
  runId: string;
  targetApp: string;
  platform: string;
  port: number;
  planDigest: string;
  onDeployStarted?: () => void;
  onStreamChunk?: (text: string) => void;
  onDeployFinished?: (success: boolean, fullLogs: string) => void;
  onReject?: () => void;
  disabled?: boolean;
}

export function DeployApprovalWidget({
  runId,
  targetApp,
  platform,
  port,
  planDigest,
  onDeployStarted,
  onStreamChunk,
  onDeployFinished,
  onReject,
  disabled = false,
}: DeployApprovalWidgetProps) {
  const [status, setStatus] = useState<"idle" | "approving" | "deploying" | "success" | "failed" | "rejected">("idle");
  const [phaseBadge, setPhaseBadge] = useState<string>("آماده دپلوی");
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    try {
      await fetch(`/api/runs/${runId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "رد شده توسط اپراتور در چت" }),
      });
      setStatus("rejected");
      setPhaseBadge("توسط اپراتور لغو شد");
      if (onReject) onReject();
    } catch {
      setStatus("rejected");
    }
  };

  const handleApproveAndDeploy = async () => {
    setStatus("approving");
    setError(null);
    setPhaseBadge("در حال ثبت تأییدیه اپراتور...");

    try {
      // 1. Send cryptographic approval
      const approveRes = await fetch(`/api/runs/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_digest: planDigest,
          approved: true,
        }),
      });

      const approveData = await approveRes.json();
      if (!approveRes.ok || !approveData.ok) {
        throw new Error(approveData.error || "خطا در ثبت امضای تأییدیه دپلوی");
      }

      // 2. Start deployment SSE stream
      setStatus("deploying");
      setPhaseBadge("در حال برقراری ارتباط با لیارا...");
      if (onDeployStarted) onDeployStarted();

      const deployRes = await fetch(`/api/runs/${runId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!deployRes.ok) {
        const errJson = await deployRes.json().catch(() => ({}));
        throw new Error(errJson.error || `خطا در آغاز دپلوی (HTTP ${deployRes.status})`);
      }

      const reader = deployRes.body?.getReader();
      if (!reader) {
        throw new Error("امکان دریافت استریم لاگ‌های دپلوی وجود ندارد.");
      }

      const decoder = new TextDecoder();
      let accumulatedLogs = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        accumulatedLogs += text;

        // Parse SSE lines
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.substring(6));
              const lineText = parsed.text || parsed.error || "";
              if (lineText && onStreamChunk) {
                onStreamChunk(lineText);
              }

              // Update phase badges
              const lower = lineText.toLowerCase();
              if (lower.includes("archive") || lower.includes("packaging")) {
                setPhaseBadge("در حال فشرده‌سازی و بسته‌بندی کد...");
              } else if (lower.includes("building") || lower.includes("step ")) {
                setPhaseBadge("در حال ساخت ایمیج در کلود لیارا...");
              } else if (lower.includes("pushing")) {
                setPhaseBadge("در حال بارگذاری ایمیج...");
              } else if (lower.includes("release created") || lower.includes("deployed")) {
                setPhaseBadge("انتشار نسخه موفقیت‌آمیز");
              }
            } catch {
              // Non-JSON SSE line
              if (onStreamChunk) onStreamChunk(line.substring(6));
            }
          }
        }
      }

      const isSuccess =
        accumulatedLogs.includes("exit code 0") ||
        accumulatedLogs.includes("successfully") ||
        accumulatedLogs.includes("Release created");

      if (isSuccess) {
        setStatus("success");
        setPhaseBadge("دپلوی با موفقیت انجام شد ✔");
        if (onDeployFinished) onDeployFinished(true, accumulatedLogs);
      } else {
        setStatus("failed");
        setPhaseBadge("دپلوی ناموفق بود ✖");
        if (onDeployFinished) onDeployFinished(false, accumulatedLogs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("failed");
      setPhaseBadge("خطا در فرآیند");
      if (onDeployFinished) onDeployFinished(false, msg);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚀</span>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              تأییدیه نهایی و اجرای دپلوی روی لیارا
            </h4>
            <p className="text-xs text-muted-foreground font-mono" dir="ltr">
              Target App: <span className="text-primary font-semibold">{targetApp}</span> | Platform: {platform} | Port: {port}
            </p>
          </div>
        </div>
        <span
          className={`text-xs rounded-full px-2.5 py-0.5 font-medium border ${
            status === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : status === "failed"
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : status === "deploying"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {phaseBadge}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>
          شناسه یکتای ران: <code className="font-mono text-primary font-semibold">{runId.substring(0, 12)}...</code>
        </div>
        <div className="font-mono text-[10px]" dir="ltr">
          Digest: {planDigest ? planDigest.substring(0, 16) : ""}...
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
          {error}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          لاگ‌های استقرار به صورت زنده در ترمینال سایدبار استریم می‌شوند.
        </span>

        {status === "idle" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={disabled}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-all cursor-pointer"
            >
              رد / انصراف
            </button>
            <button
              type="button"
              onClick={handleApproveAndDeploy}
              disabled={disabled}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shadow"
            >
              <span>⚡</span>
              <span>تأیید و اجرای دپلوی خودکار</span>
            </button>
          </div>
        )}

        {status === "rejected" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>✖</span>
            <span>دپلوی توسط اپراتور لغو شد.</span>
          </div>
        )}

        {(status === "approving" || status === "deploying") && (
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <span>در حال اجرای عملیات دپلوی...</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
            <span>✔</span>
            <span>دپلوی کامل شد. در حال اعتبارسنجی سلامت سرویس...</span>
          </div>
        )}

        {status === "failed" && (
          <button
            type="button"
            onClick={handleApproveAndDeploy}
            disabled={disabled}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 transition-all cursor-pointer shadow"
          >
            <span>🔄</span>
            <span>تلاش مجدد برای دپلوی</span>
          </button>
        )}
      </div>
    </div>
  );
}

