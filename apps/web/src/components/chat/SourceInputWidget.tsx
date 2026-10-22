"use client";

import React, { useState } from "react";
import { FolderCode, UploadCloud, GitBranch, ArrowLeft, CheckCircle2 } from "lucide-react";

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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 w-full flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-lg text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("path")}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            tab === "path" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FolderCode className="h-3.5 w-3.5 text-blue-400" />
          <span>مسیر محلی پوشه</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("zip")}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            tab === "zip" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
          <span>فایل ZIP</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("git")}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            tab === "git" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5 text-purple-400" />
          <span>ریپازیتوری Git</span>
        </button>
      </div>

      {/* Tab 1: Local Path */}
      {tab === "path" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="مثال: sample-apps/nodejs-demo یا /path/to/project"
              disabled={loading || disabled}
              dir="ltr"
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleSubmitPath()}
              disabled={!pathInput.trim() || loading || disabled}
              className="h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              <span>بررسی سورس</span>
              <ArrowLeft className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-zinc-500">انتخاب سریع نمونه:</span>
            <button
              type="button"
              onClick={() => {
                setPathInput("sample-apps/nodejs-demo");
                handleSubmitPath("sample-apps/nodejs-demo");
              }}
              className="text-blue-400 hover:underline"
            >
              پروژه تست Node.js (sample-apps/nodejs-demo)
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: ZIP File Upload */}
      {tab === "zip" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading || disabled}
              className="flex-1 text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
            <button
              type="button"
              onClick={handleSubmitZip}
              disabled={!file || loading || disabled}
              className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              <span>آپلود و استخراج</span>
              <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">فایل فشرده پروژه شما در محیط ایزوله اکسترکت خواهد شد.</p>
        </div>
      )}

      {/* Tab 3: Git URL Clone */}
      {tab === "git" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={gitInput}
              onChange={(e) => setGitInput(e.target.value)}
              placeholder="https://github.com/username/repository.git"
              disabled={loading || disabled}
              dir="ltr"
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSubmitGit}
              disabled={!gitInput.trim() || loading || disabled}
              className="h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              <span>کلون ریپازیتوری</span>
              <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">ریپازیتوری‌های پابلیک GitHub و GitLab به صورت امن دریافت می‌شوند.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}
