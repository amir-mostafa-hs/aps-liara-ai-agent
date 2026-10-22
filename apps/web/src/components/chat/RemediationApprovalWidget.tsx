"use client";

import React, { useState } from "react";

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
  disabled?: boolean;
}

export function RemediationApprovalWidget({
  runId,
  targetApp,
  rootCause,
  errorEvidence,
  missingVariable = "SERVICE_SECRET",
  suggestedValue = "",
  onRemediated,
  disabled = false,
}: RemediationApprovalWidgetProps) {
  const [val, setVal] = useState<string>(suggestedValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isRecovered: boolean; verification: any } | null>(null);

  const handleApply = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/remediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          env_value: val.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطا در اعمال راهکار خودترمیمی");
      }

      setResult({
        isRecovered: Boolean(data.isRecovered),
        verification: data.verification,
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

  if (result?.isRecovered) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>✔</span>
          <span>راهکار خودترمیمی با موفقیت اعمال شد و برنامه به وضعیت سالم (Healthy) رسید!</span>
        </div>
        <p className="mt-1 text-xs text-emerald-400/80">
          کد وضعیت HTTP: {result.verification?.http_status_code || 200} | آدرس سرویس:{" "}
          <a
            href={result.verification?.endpoint_url}
            target="_blank"
            rel="noreferrer"
            className="underline font-mono"
            dir="ltr"
          >
            {result.verification?.endpoint_url}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xl">🩺</span>
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              تشخیص هوشمند ریشه خطا و راهکار خودترمیمی (SRE)
            </h4>
            <p className="text-xs text-amber-400/70 font-mono" dir="ltr">
              App: {targetApp}
            </p>
          </div>
        </div>
        <span className="text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 font-medium">
          خطای ران‌تایم شناسایی شد
        </span>
      </div>

      {/* Root Cause Explanation in Persian */}
      <div className="mt-3 text-xs leading-relaxed text-foreground">
        <p className="font-semibold text-amber-200 mb-1">علت وقوع خطا:</p>
        <p className="text-muted-foreground">{rootCause}</p>
      </div>

      {/* Error Evidence Log */}
      {errorEvidence && (
        <div className="mt-3">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            شواهد مستقیم از لاگ‌های برنامه:
          </span>
          <pre
            className="rounded-lg bg-neutral-950 p-2.5 font-mono text-[11px] text-rose-400 border border-neutral-800 overflow-x-auto whitespace-pre-wrap"
            dir="ltr"
          >
            {errorEvidence}
          </pre>
        </div>
      )}

      {/* Suggested Remediation */}
      {missingVariable && (
        <div className="mt-3 bg-card/40 rounded-xl p-3 border border-border">
          <label className="block text-xs font-medium text-foreground mb-1">
            مقدار متغیر محیطی پیشنهادی جهت تزریق به سرویس (
            <code className="text-primary font-mono">{missingVariable}</code>):
          </label>
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            disabled={loading || disabled}
            placeholder={`مقدار برای ${missingVariable}`}
            dir="ltr"
            className="w-full text-left font-mono rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Action CTA */}
      <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          پس از اعمال، سلامت سرویس به طور خودکار مجدداً بررسی می‌شود.
        </span>
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || disabled}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <span>در حال اعمال راهکار و بررسی سلامت...</span>
            </>
          ) : (
            <>
              <span>🩹</span>
              <span>اعمال راهکار رفع مشکل و اعتبارسنجی مجدد</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
