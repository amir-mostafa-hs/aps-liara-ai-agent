"use client";

import React, { useState, useEffect } from "react";

interface DiffPreviewWidgetProps {
  sourcePath: string;
  appName: string;
  platform: string;
  port: number;
  envVars: Record<string, string>;
  onApplied: (result: {
    modifiedFiles: string[];
    cloudEnvSet: boolean;
  }) => void;
  disabled?: boolean;
}

export function DiffPreviewWidget({
  sourcePath,
  appName,
  platform,
  port,
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
      // 1. Apply file changes (liara.json and optional local .env)
      const resConfig = await fetch("/api/project/config/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          appName,
          platform,
          port,
          applyLiaraJson: true,
          applyLocalEnv,
          envVars,
        }),
      });
      const dataConfig = await resConfig.json();
      if (!resConfig.ok || !dataConfig.ok) {
        throw new Error(dataConfig.error || "خطا در اعمال تغییرات فایل‌ها");
      }

      // 2. Set cloud environment variables on Liara
      let cloudEnvSet = false;
      if (envVars && Object.keys(envVars).length > 0) {
        const resEnv = await fetch("/api/liara/env/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appName,
            envVars,
          }),
        });
        const dataEnv = await resEnv.json();
        if (resEnv.ok && dataEnv.ok) {
          cloudEnvSet = true;
        }
      }

      setApplied(true);
      onApplied({
        modifiedFiles: dataConfig.modified_files || ["liara.json"],
        cloudEnvSet,
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
        <div className="p-4 text-center text-xs text-muted-foreground">
          تغییری برای نمایش وجود ندارد.
        </div>
      );
    }

    const lines = rawDiff.split("\n");
    return (
      <div className="font-mono text-[11px] leading-relaxed p-3 overflow-x-auto space-y-0.5" dir="ltr">
        {lines.map((line, idx) => {
          let lineClass = "text-muted-foreground";
          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineClass = "bg-emerald-500/15 text-emerald-400 font-semibold px-1 rounded-sm";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineClass = "bg-rose-500/15 text-rose-400 line-through px-1 rounded-sm";
          } else if (line.startsWith("@@")) {
            lineClass = "text-cyan-400 text-[10px]";
          }
          return (
            <div key={idx} className={lineClass}>
              {line || " "}
            </div>
          );
        })}
      </div>
    );
  };

  if (applied) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>✔</span>
          <span>فایل‌های تنظیمات به‌روز شدند و متغیرها در لیارا تزریق گردیدند.</span>
        </div>
        <p className="mt-1 text-xs text-emerald-400/80">
          پلن دپلوی آماده شد و می‌توانید فرآیند استقرار را آغاز کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              پیش‌نمایش تغییرات فایل‌های پروژه (Diff)
            </h4>
            <p className="text-xs text-muted-foreground">
              پیش از اعمال، خطوط اضافه یا حذف‌شده را بررسی کنید. هیچ تغییری بدون تأیید شما ثبت نمی‌شود.
            </p>
          </div>
        </div>
      </div>

      {loadingDiff ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>در حال تولید پیش‌نمایش تغییرات...</span>
        </div>
      ) : (
        <>
          {/* File Tabs */}
          <div className="mt-3 flex items-center gap-2 border-b border-border/40 pb-2">
            {diffData &&
              Object.keys(diffData).map((fileName) => (
                <button
                  key={fileName}
                  type="button"
                  onClick={() => setActiveTab(fileName)}
                  className={`px-3 py-1 text-xs rounded-lg font-mono transition-colors cursor-pointer ${
                    activeTab === fileName
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {fileName}
                </button>
              ))}
          </div>

          {/* Diff Viewer Box */}
          <div className="mt-2 rounded-xl border border-border/80 bg-neutral-950/80 max-h-56 overflow-y-auto">
            {diffData && diffData[activeTab]
              ? renderDiffLines(diffData[activeTab].diff)
              : null}
          </div>

          {/* Local .env toggle */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="applyLocalEnv"
              checked={applyLocalEnv}
              onChange={(e) => setApplyLocalEnv(e.target.checked)}
              disabled={applying || disabled}
              className="rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor="applyLocalEnv"
              className="text-xs text-foreground cursor-pointer select-none"
            >
              متغیرهای اتصال پایگاه‌داده در فایل محلی <code className="text-primary font-mono">.env</code> نیز ذخیره شوند
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end">
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || disabled}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shadow"
            >
              {applying ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>در حال ذخیره و تزریق متغیرها...</span>
                </>
              ) : (
                <>
                  <span>✔</span>
                  <span>اعمال خودکار تغییرات و ساخت پلن دپلوی</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
