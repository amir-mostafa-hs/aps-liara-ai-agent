"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface DiffPreviewWidgetProps {
  sourcePath: string;
  appName: string;
  platform: string;
  port: number;
  startCommand?: string;
  envVars: Record<string, string>;
  onApplied: (result: {
    modifiedFiles: string[];
    envVars: Record<string, string>;
  }) => void;
  disabled?: boolean;
}

export function DiffPreviewWidget({
  sourcePath,
  appName,
  platform,
  port,
  startCommand,
  envVars,
  onApplied,
  disabled = false,
}: DiffPreviewWidgetProps) {
  const [activeTab, setActiveTab] = useState<string>("liara.json");
  const [diffData, setDiffData] = useState<any>(null);
  const [loadingDiff, setLoadingDiff] = useState(true);
  const [applyLocalEnv, setApplyLocalEnv] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/project/config/diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourcePath,
        appName,
        platform,
        port,
        startCommand,
        envVars,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.ok) {
          setDiffData(data.files);
        } else {
          setError(data.error || "خطا در دریافت تغییرات پیشنهادی");
        }
      })
      .catch((err) => {
        if (isMounted) setError(String(err));
      })
      .finally(() => {
        if (isMounted) setLoadingDiff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourcePath, appName, platform, port, envVars]);

  const handleApply = async () => {
    setApplying(true);
    setError(null);

    try {
      const resConfig = await fetch("/api/project/config/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          appName,
          platform,
          port,
          startCommand,
          applyLiaraJson: true,
          applyLocalEnv,
          envVars,
        }),
      });
      const dataConfig = await resConfig.json();
      if (!resConfig.ok || !dataConfig.ok) {
        throw new Error(dataConfig.error || "خطا در اعمال تغییرات فایل‌ها");
      }

      setApplied(true);
      onApplied({
        modifiedFiles: dataConfig.modified_files || ["liara.json"],
        envVars,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setApplying(false);
    }
  };

  const renderDiffLines = (rawDiff: string) => {
    if (!rawDiff || !rawDiff.trim()) {
      return (
        <div className="p-4 text-center text-xs text-zinc-500">
          تغییری برای نمایش وجود ندارد.
        </div>
      );
    }

    const lines = rawDiff.split("\n");
    return (
      <pre dir="ltr" className="scroll overflow-x-auto py-2 font-mono text-xs leading-6">
        <code className="block">
          {lines.map((line, idx) => {
            if (line.startsWith("+") && !line.startsWith("+++")) {
              return (
                <span key={idx} className="block bg-emerald-500/10 px-4 text-emerald-300">
                  {line}
                </span>
              );
            }
            if (line.startsWith("-") && !line.startsWith("---")) {
              return (
                <span key={idx} className="block bg-rose-500/10 px-4 text-rose-300">
                  {line}
                </span>
              );
            }
            return (
              <span key={idx} className="block px-4 text-zinc-400">
                {line || " "}
              </span>
            );
          })}
        </code>
      </pre>
    );
  };

  if (applied) {
    return (
      <article className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-400/[.04] p-5 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/state-success.webp"
          alt=""
          className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-80 [mask-image:linear-gradient(to_right,#000_30%,transparent)] pointer-events-none"
        />
        <div className="relative sm:w-3/5 mr-auto space-y-1">
          <h3 className="font-bold text-emerald-300 text-base">تغییرات اعمال شد</h3>
          <p className="t">
            فایل تنظیمات <code className="text-emerald-200 font-mono">liara.json</code> ساخته شد و متغیرها تنظیم گردیدند.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/icon-diff.webp" alt="" className="ico fl" />
      <div className="body">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-100 text-base">بازبینی تغییرات فایل‌ها</h3>
          <span className="pill border border-liara/30 bg-liara/10 text-liara">
            {appName}
          </span>
        </div>

        <p className="t">
          پیش از اقدام به دپلوی، تغییرات ایجاد شده در فایل‌های پیکربندی را بررسی نمایید:
        </p>

        {loadingDiff ? (
          <div className="flex items-center justify-center p-6 text-zinc-400 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-liara" />
            <span>در حال ایجاد پیش‌نمایش تغییرات...</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {/* Diff header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[.04] px-4 py-2 text-xs">
              <div className="flex gap-2">
                {diffData?.liara_json && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("liara.json")}
                    className={`font-mono text-xs px-2.5 py-1 rounded-lg transition-all ${
                      activeTab === "liara.json"
                        ? "bg-liara/20 text-liara border border-liara/30 font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    liara.json
                  </button>
                )}
                {diffData?.env_file && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(".env")}
                    className={`font-mono text-xs px-2.5 py-1 rounded-lg transition-all ${
                      activeTab === ".env"
                        ? "bg-liara/20 text-liara border border-liara/30 font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    .env
                  </button>
                )}
              </div>
              <span dir="ltr" className="font-mono text-xs text-zinc-400">
                {activeTab}
              </span>
            </div>

            {/* Diff content */}
            {activeTab === "liara.json" && renderDiffLines(diffData?.liara_json?.diff || "")}
            {activeTab === ".env" && renderDiffLines(diffData?.env_file?.diff || "")}
          </div>
        )}

        {/* Local .env toggle */}
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={applyLocalEnv}
            onChange={(e) => setApplyLocalEnv(e.target.checked)}
            disabled={applying || disabled}
            className="rounded border-white/20 bg-black/40 text-liara focus:ring-liara/30"
          />
          <span>متغیرهای جدید در فایل محلی <code className="text-zinc-300 font-mono">.env</code> نیز ذخیره شوند</span>
        </label>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || loadingDiff || disabled}
            className="b2 flex items-center justify-center gap-2"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
            <span>اعمال تغییرات</span>
          </button>
        </div>
      </div>
    </article>
  );
}
