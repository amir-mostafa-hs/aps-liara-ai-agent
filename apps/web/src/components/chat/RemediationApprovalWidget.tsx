"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { canGenerateSecretForEnvName } from "@/lib/remediation-approval";

interface RemediationApprovalWidgetProps {
  runId: string;
  targetApp: string;
  rootCause: string;
  errorEvidence: string;
  missingVariable?: string;
  suggestedValue?: string;
  onRemediated?: (result: {
    isRecovered: boolean;
    verification: any;
  }) => void;
  onReject?: () => void;
  disabled?: boolean;
}

export function RemediationApprovalWidget({
  runId,
  targetApp,
  rootCause,
  errorEvidence,
  missingVariable,
  suggestedValue = "",
  onRemediated,
  onReject,
  disabled = false,
}: RemediationApprovalWidgetProps) {
  const [envValue, setEnvValue] = useState<string>(suggestedValue);
  const [valueSource, setValueSource] = useState<"manual" | "generated" | null>(suggestedValue ? "manual" : null);
  const [showGeneratedSecret, setShowGeneratedSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isRecovered: boolean; verification: any; generatedSecret?: string } | null>(null);
  const canGenerate = Boolean(missingVariable && canGenerateSecretForEnvName(missingVariable));

  const createSecret = () => {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const handleApply = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = `/api/runs/${runId}/remediate`;
      const approvedValues = {
        approved: true,
        targetApp,
        env_value: envValue.trim() || undefined,
        value_source: valueSource || "manual",
      };
      const approvalResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...approvedValues, phase: "approve" }),
      });
      const approvalData = await approvalResponse.json();
      if (!approvalResponse.ok || !approvalData.ok || !approvalData.approvalId) {
        throw new Error(approvalData.error || "تأیید راهکار ثبت نشد.");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...approvedValues, phase: "execute", approval_id: approvalData.approvalId }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطا در اعمال راهکار خودترمیمی");
      }

      setResult({
        isRecovered: Boolean(data.isRecovered),
        verification: data.verification,
        generatedSecret: valueSource === "generated" ? envValue : undefined,
      });

      if (onRemediated) {
        onRemediated({
          isRecovered: Boolean(data.isRecovered),
          verification: data.verification,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    setRejected(true);
    if (onReject) onReject();
  };

  if (result?.isRecovered) {
    return (
      <article className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-400/[.04] p-5 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/state-success.webp"
          alt=""
          className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-80 [mask-image:linear-gradient(to_right,#000_30%,transparent)] pointer-events-none"
        />
        <div className="relative sm:w-3/5 mr-auto space-y-1">
          <h3 className="font-bold text-emerald-300 text-base">سرویس با موفقیت احیا شد</h3>
          <p className="t">
            راهکار خودترمیمی اعمال گردید و برنامه به وضعیت سالم (HTTP {result.verification?.http_status_code || 200}) رسید.
          </p>
          {result.generatedSecret && (
            <div className="mt-3 rounded-none border border-amber-500/40 bg-zinc-950/80 p-3 text-xs text-amber-200 space-y-1">
              <p>این Secret اختصاصی فقط همین‌جا نمایش داده می‌شود:</p>
              <div className="flex flex-wrap items-center gap-2 font-mono">
                <code>{showGeneratedSecret ? result.generatedSecret : "•".repeat(24)}</code>
                <button
                  type="button"
                  className="underline text-liara cursor-pointer font-sans"
                  onClick={() => setShowGeneratedSecret((s) => !s)}
                >
                  {showGeneratedSecret ? "پنهان" : "نمایش موقت"}
                </button>
                <button
                  type="button"
                  className="underline text-liara cursor-pointer font-sans"
                  onClick={() => void navigator.clipboard.writeText(result.generatedSecret || "")}
                >
                  کپی امن
                </button>
              </div>
            </div>
          )}
        </div>
      </article>
    );
  }

  if (result && !result.isRecovered) {
    return (
      <div className="rounded-none border border-amber-400/30 bg-amber-400/[.05] p-4 text-xs text-amber-200 space-y-1">
        <p className="font-bold text-sm">متغیر در لیارا ثبت شد، اما سلامت برنامه هنوز احراز نشده است.</p>
        <p className="text-zinc-400">برای جلوگیری از تکرار تغییرات، این راهکار دوباره اعمال نمی‌شود. لاگ‌های کنسول جانبی را بررسی نمایید.</p>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="rounded-none border border-zinc-800 bg-zinc-950/80 p-3 text-xs font-mono text-zinc-400">
        عملیات خودترمیمی توسط اپراتور رد شد.
      </div>
    );
  }

  return (
    <article className="card !border-rose-500/40 !bg-rose-500/[.03] relative w-full overflow-hidden rounded-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/state-error.webp"
        alt=""
        className="bgimg !opacity-30 [mask-image:linear-gradient(to_left,#000,transparent_70%)] pointer-events-none"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/icon-heal.webp" alt="" className="ico fl relative !w-10 !h-10" />
      <div className="body">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-rose-300 text-base">خودترمیمی SRE</h3>
          <span className="pill bg-rose-500/15 text-rose-300 border border-rose-500/30">
            خطا در سلامت‌سنجی
          </span>
        </div>

        <p className="t">
          <b>علت ریشه‌ای:</b> {rootCause}
        </p>

        {errorEvidence && (
          <div className="rounded-none border border-zinc-800 bg-zinc-950/80 p-2.5 font-mono text-xs text-rose-300/90 overflow-x-auto max-h-24">
            {errorEvidence}
          </div>
        )}

        {missingVariable && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>متغیر محیطی نیازمند مقدار:</span>
              <code className="text-liara font-mono">{missingVariable}</code>
            </div>

            {canGenerate && (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setValueSource("generated");
                    setEnvValue(createSecret());
                  }}
                  className={`rounded-none px-3 py-1 border transition-all cursor-pointer font-mono ${
                    valueSource === "generated"
                      ? "border-mint bg-mint/15 text-mint font-bold"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  تولید خودکار کلید تصادفی امن
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValueSource("manual");
                    setEnvValue("");
                  }}
                  className={`rounded-none px-3 py-1 border transition-all cursor-pointer font-mono ${
                    valueSource === "manual"
                      ? "border-mint bg-mint/15 text-mint font-bold"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ورود دستی مقدار
                </button>
              </div>
            )}

            <input
              type="text"
              dir="ltr"
              value={envValue}
              onChange={(e) => {
                setEnvValue(e.target.value);
                if (valueSource !== "manual") setValueSource("manual");
              }}
              placeholder="مقدار متغیر را وارد کنید یا گزینه تولید را بزنید"
              className="inp"
            />
          </div>
        )}

        {error && (
          <p className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-none p-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || disabled || (missingVariable ? !envValue.trim() : false)}
            className="b3 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
            <span>اعمال اصلاحیه و بررسی دوباره</span>
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading || disabled}
            className="rounded-none border border-zinc-800 px-4 py-2 text-xs font-mono text-zinc-400 hover:text-rose-300 hover:border-rose-500/40 cursor-pointer transition-colors"
          >
            رد عملیات
          </button>
        </div>
      </div>
    </article>
  );
}
