"use client";

import React, { useState } from "react";
import { canGenerateSecretForEnvName, isSensitiveEnvName } from "@/lib/remediation-approval";

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
        {result.generatedSecret && <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          <p>این secret امن فقط همین‌جا نمایش داده می‌شود. آن را در محل امن ذخیره کنید؛ بعد از بستن صفحه قابل بازیابی نیست.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code dir="ltr">{showGeneratedSecret ? result.generatedSecret : "•".repeat(24)}</code>
            <button type="button" className="underline" onClick={() => setShowGeneratedSecret((show) => !show)}>{showGeneratedSecret ? "پنهان" : "نمایش موقت"}</button>
            <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(result.generatedSecret || "")}>کپی امن</button>
          </div>
        </div>}
      </div>
    );
  }

  if (result && !result.isRecovered) {
    return <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-amber-200">
      <p className="font-semibold text-sm">متغیر در Liara ثبت شد، اما سلامت برنامه هنوز تأیید نشده است.</p>
      <p className="mt-1 text-xs">برای جلوگیری از تغییر تکراری، این راهکار دوباره اجرا نمی‌شود. لاگ‌های runtime و تنظیمات برنامه را بررسی کنید.</p>
      {result.generatedSecret && <div className="mt-3 rounded-lg border border-amber-500/40 p-3 text-xs">
        <p>این secret را در محل امن ذخیره کنید؛ پس از بستن صفحه قابل بازیابی نیست.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><code dir="ltr">{showGeneratedSecret ? result.generatedSecret : "•".repeat(24)}</code>
          <button type="button" className="underline" onClick={() => setShowGeneratedSecret((show) => !show)}>{showGeneratedSecret ? "پنهان" : "نمایش موقت"}</button>
          <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(result.generatedSecret || "")}>کپی امن</button>
        </div>
      </div>}
    </div>;
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
      {missingVariable ? (
        <div className="mt-3 bg-card/40 rounded-xl p-3 border border-border">
          <label className="block text-xs font-medium text-foreground mb-1">
            مقدار متغیر محیطی برای ثبت روی سرویس تأییدشده (
            <code className="text-primary font-mono">{missingVariable}</code>):
          </label>
          {canGenerate && <fieldset className="mb-3 space-y-2 text-xs">
            <legend>برای تأمین این secret چه روشی را انتخاب می‌کنید؟</legend>
            <label className="flex items-center gap-2"><input type="radio" name="remediation-value-source" checked={valueSource === "manual"} onChange={() => { setValueSource("manual"); setEnvValue(""); }} /> خودم مقدار را وارد می‌کنم</label>
            <label className="flex items-center gap-2"><input type="radio" name="remediation-value-source" checked={valueSource === "generated"} onChange={() => { setValueSource("generated"); setEnvValue(createSecret()); }} /> مقدار امن تصادفی بساز</label>
          </fieldset>}
          <input
            type={isSensitiveEnvName(missingVariable) ? "password" : "text"}
            value={envValue}
            onChange={(e) => { setValueSource("manual"); setEnvValue(e.target.value); }}
            disabled={loading || disabled || valueSource === "generated"}
            placeholder={`مقدار برای ${missingVariable}`}
            dir="ltr"
            className="w-full text-left font-mono rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {valueSource === "generated" && <p className="mt-2 text-amber-300">مقدار ساخته شد؛ با زدن دکمهٔ تأیید، فقط برای <strong>{targetApp}</strong> ثبت می‌شود. پس از ثبت آن را در محل امن ذخیره کنید.</p>}
          {!canGenerate && missingVariable && <p className="mt-2 text-muted-foreground">این مقدار از طرف سرویس مربوطه ارائه می‌شود؛ آن را تولید نکنید.</p>}
        </div>
      ) : (
        <div className="mt-3 bg-card/40 rounded-xl p-3 border border-border">
          <p className="text-xs text-foreground font-medium mb-1">
            راهکار پیشنهادی ایجنت SRE:
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            لطفاً از وجود داشتن اپلیکیشن با نام فوق در حساب یا تیم لیارا اطمینان حاصل کرده و در صورت نیاز نام اپلیکیشن را تغییر داده یا از لیست سرویس‌ها انتخاب کنید.
          </p>
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
          {missingVariable
            ? "پس از اعمال، سلامت سرویس به طور خودکار مجدداً بررسی می‌شود."
            : "این مشکل با تغییر خودکار تنظیمات حل نمی‌شود؛ سرویس مقصد را انتخاب یا ایجاد کنید و دپلوی را دوباره اجرا کنید."}
        </span>
        {rejected ? (
          <span className="text-xs text-muted-foreground">عملیات لغو گردید.</span>
        ) : !missingVariable ? (
          <button
            type="button"
            onClick={handleReject}
            disabled={disabled}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-all cursor-pointer"
          >
            متوجه شدم
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={loading || disabled || !envValue.trim() || (canGenerate && !valueSource)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-all cursor-pointer"
            >
              انصراف
            </button>
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
                  <span>تأیید ثبت تغییر و بررسی دوبارهٔ سلامت</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

