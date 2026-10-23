"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface SourceInputWidgetProps {
  onSourceIngested: (sourcePath: string, type: string) => void;
  disabled?: boolean;
}

export function SourceInputWidget({
  onSourceIngested,
  disabled = false,
}: SourceInputWidgetProps) {
  const [tab, setTab] = useState<"path" | "zip" | "git">("path");
  const [pathInput, setPathInput] = useState("sample-apps/nodejs-demo");
  const [gitInput, setGitInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitPath = async (overridePath?: string) => {
    const targetPath = overridePath || pathInput;
    if (!targetPath.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/project/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "path", path: targetPath.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      onSourceIngested(data.sourcePath, "path");
    } catch (err: any) {
      setError(err.message || "خطا در بررسی مسیر");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGit = async () => {
    if (!gitInput.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/project/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "git", gitUrl: gitInput.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      onSourceIngested(data.sourcePath, "git");
    } catch (err: any) {
      setError(err.message || "خطا در کلون ریپازیتوری");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitZip = async () => {
    if (!file || loading || disabled) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/project/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      onSourceIngested(data.sourcePath, "zip");
    } catch (err: any) {
      setError(err.message || "خطا در آپلود فایل ZIP");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (tab === "path") handleSubmitPath();
    else if (tab === "zip") handleSubmitZip();
    else if (tab === "git") handleSubmitGit();
  };

  return (
    <article className="card w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/icon-source.webp"
        alt=""
        className="ico fl"
      />
      <div className="body">
        <h3 className="font-bold text-zinc-100 text-base">سورس پروژه را مشخص کنید</h3>

        <div className="relative rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
          {/* Tab Selection */}
          <div className="flex gap-1 rounded-xl bg-black/30 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("path")}
              className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                tab === "path"
                  ? "bg-liara/15 text-liara shadow-inner border border-liara/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              مسیر محلی
            </button>
            <button
              type="button"
              onClick={() => setTab("zip")}
              className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                tab === "zip"
                  ? "bg-liara/15 text-liara shadow-inner border border-liara/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              فایل ZIP
            </button>
            <button
              type="button"
              onClick={() => setTab("git")}
              className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                tab === "git"
                  ? "bg-liara/15 text-liara shadow-inner border border-liara/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              مخزن Git
            </button>
          </div>

          {/* Tab Panels */}
          {tab === "path" && (
            <div className="space-y-2">
              <input
                type="text"
                dir="ltr"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                disabled={loading || disabled}
                placeholder="sample-apps/nodejs-demo"
                className="inp"
              />
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                <span>نمونه‌های آماده:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPathInput("sample-apps/nodejs-demo");
                    handleSubmitPath("sample-apps/nodejs-demo");
                  }}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-liara hover:bg-white/10 cursor-pointer font-mono"
                >
                  sample-apps/nodejs-demo
                </button>
              </div>
            </div>
          )}

          {tab === "zip" && (
            <div className="space-y-2">
              <label className="grid place-items-center rounded-xl border border-dashed border-white/20 py-7 text-sm text-zinc-400 hover:border-liara/50 hover:bg-white/[.02] cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".zip"
                  className="sr-only"
                  disabled={loading || disabled}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                {file ? (
                  <span className="font-mono text-xs text-liara">{file.name}</span>
                ) : (
                  "فایل ZIP را اینجا رها کنید یا کلیک کنید"
                )}
              </label>
            </div>
          )}

          {tab === "git" && (
            <div className="space-y-2">
              <input
                type="text"
                dir="ltr"
                value={gitInput}
                onChange={(e) => setGitInput(e.target.value)}
                disabled={loading || disabled}
                placeholder="https://github.com/user/repo.git"
                className="inp"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAction}
          disabled={loading || disabled}
          className="b1 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
          <span>بازرسی سورس</span>
        </button>
      </div>
    </article>
  );
}
