"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { createDeployStreamParser } from "@/lib/deploy-stream";

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
  const [phaseBadge, setPhaseBadge] = useState<string>("در انتظار تأیید شما");
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
    setPhaseBadge("در حال ثبت تأییدیه...");

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
      setPhaseBadge("در حال ارسال بسته به لیارا...");
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
      const parser = createDeployStreamParser((lineText) => {
        onStreamChunk?.(lineText);
        const lower = lineText.toLowerCase();
        if (lower.includes("archive") || lower.includes("packaging")) setPhaseBadge("در حال فشرده‌سازی سورس...");
        else if (lower.includes("building") || lower.includes("step ")) setPhaseBadge("در حال ساخت ایمیج ابری...");
        else if (lower.includes("pushing")) setPhaseBadge("در حال بارگذاری کانتینر...");
        else if (lower.includes("release created") || lower.includes("deployed")) setPhaseBadge("انتشار نسخه روی لیارا...");
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.push(decoder.decode());
      const result = parser.finish();
      const isSuccess = result.succeeded;
      if (isSuccess) {
        setStatus("success");
        setPhaseBadge("دپلوی موفق");
        onDeployFinished?.(true, result.logs);
      } else {
        setStatus("failed");
        setPhaseBadge("دپلوی ناموفق");
        onDeployFinished?.(false, result.logs || "پاسخ نهایی دپلوی از سرور دریافت نشد.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("failed");
      setPhaseBadge("خطا در فرآیند");
      if (onDeployFinished) onDeployFinished(false, msg);
    }
  };

  if (status === "success") {
    return (
      <article className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/[.04] p-5 shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/state-success.webp"
          alt=""
          className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-80 [mask-image:linear-gradient(to_right,#000_30%,transparent)] pointer-events-none"
        />
        <div className="relative ml-auto w-full p-2 text-right sm:w-3/5 space-y-1">
          <h3 className="font-bold text-emerald-300 text-base">دپلوی با موفقیت انجام شد</h3>
          <p className="t">
            برنامه شما روی{" "}
            <a
              href={`https://${targetApp}.liara.run`}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="text-liara font-mono text-xs underline underline-offset-2 hover:brightness-125 font-bold"
            >
              {targetApp}.liara.run
            </a>{" "}
            در دسترس است.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card !border-amber-500/40 !bg-amber-500/[.03] relative w-full overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/bg-mint.webp" alt="" className="bgimg pointer-events-none" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/icon-deploy.webp" alt="" className="ico fl relative !w-10 !h-10" />
      <div className="body">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-amber-300 text-base">تأیید دپلوی</h3>
          <span className="pill bg-amber-400/15 text-amber-300 border border-amber-400/30">
            <span role="status" aria-live="polite">{phaseBadge}</span>
          </span>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm pt-1">
          <dt className="text-zinc-400">شناسه اجرا</dt>
          <dd dir="ltr" className="text-left font-mono text-xs text-zinc-200">
            {runId.substring(0, 16)}...
          </dd>
          <dt className="text-zinc-400">سرویس مقصد</dt>
          <dd dir="ltr" className="text-left font-mono text-xs text-zinc-200">
            {targetApp} ({platform} · پورت {port})
          </dd>
          <dt className="text-zinc-400">خلاصه طرح</dt>
          <dd dir="ltr" className="break-all text-left font-mono text-xs text-zinc-300">
            sha256:{planDigest}
          </dd>
          <dt className="text-zinc-400">اقدام‌ها</dt>
          <dd className="text-zinc-300">ارسال بسته سورس، ساخت ابری کانتینر، اجرای سرویس</dd>
        </dl>

        {error && (
          <p role="alert" aria-live="assertive" className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
            {error}
          </p>
        )}

        {(status === "idle" || status === "approving") && (
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleApproveAndDeploy}
              disabled={disabled || status === "approving"}
              className="btn bg-emerald-400 text-zinc-950 font-bold hover:brightness-110 cursor-pointer flex items-center gap-1.5 rounded-lg font-mono text-xs"
            >
              {status === "approving" && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>تأیید و آغاز دپلوی</span>
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={disabled || status === "approving"}
              className="rounded-lg border border-rose-500/40 px-4 py-2 text-xs font-mono text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors"
            >
              رد عملیات
            </button>
          </div>
        )}

        {status === "deploying" && (
          <div className="flex items-center gap-2 text-xs text-amber-300 pt-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span>در حال ارتباط با لیارا و دریافت لاگ‌های دپلوی در کنسول جانبی...</span>
          </div>
        )}

        {status === "rejected" && (
          <p className="text-xs text-rose-300 pt-2 font-medium">
            این عملیات دپلوی توسط اپراتور رد شد.
          </p>
        )}
      </div>
    </article>
  );
}
