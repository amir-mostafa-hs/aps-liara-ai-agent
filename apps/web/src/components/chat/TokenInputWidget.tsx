"use client";

import React, { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2, ExternalLink, ArrowLeft, Shield } from "lucide-react";

interface TokenInputWidgetProps {
  onTokenSaved?: (maskedToken: string, teams?: any[]) => void;
  initialTokenMasked?: string;
}

export function TokenInputWidget({
  onTokenSaved,
  initialTokenMasked = "",
}: TokenInputWidgetProps) {
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    initialTokenMasked ? `توکن فعال: ${initialTokenMasked}` : null
  );

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/liara-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          teamId: teamId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setSuccess(`توکن با موفقیت در پروفایل شما ذخیره شد: ${data.maskedToken}`);
      setToken("");
      if (onTokenSaved) {
        onTokenSaved(data.maskedToken, data.teams);
      }
    } catch (err: any) {
      setError(err.message || "خطا در اعتبارسنجی و ذخیره توکن");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 w-full flex flex-col gap-3.5 shadow-lg">
      {/* Educational Guide Header */}
      <div className="flex items-start gap-3 border-b border-zinc-800/80 pb-3">
        <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
          <Key className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-100">تنظیم کلید دسترسی (API Token) لیارا</h4>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Shield className="h-3 w-3" />
              ذخیره محلی امن
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            برای صدور دستورات خودکار، وارد{" "}
            <a
              href="https://console.liara.ir"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              کنسول کاربری لیارا
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            شوید، از بخش پروفایل روی <strong>«دسترسی به API»</strong> کلیک کنید و کلید جدید بسازید.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-zinc-400 font-medium">توکن API لیارا:</label>
          <div className="relative flex items-center">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="مثال: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              disabled={loading}
              dir="ltr"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute left-3 text-zinc-500 hover:text-zinc-300"
              title={showToken ? "مخفی کردن" : "نمایش"}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-zinc-400 font-medium">شناسه تیم در لیارا (اختیاری):</label>
          <input
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="مثلاً: 6ace4ec3ec13fe0c3c19c4db (در صورت استفاده از حالت تیمی)"
            disabled={loading}
            dir="ltr"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-zinc-500">
            توکن شما به مدل هوش مصنوعی ارسال نمی‌شود و فقط برای فراخوانی امن CLI لیارا استفاده می‌شود.
          </span>
          <button
            type="submit"
            disabled={!token.trim() || loading}
            className="h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-md shadow-blue-500/20"
          >
            <span>{loading ? "در حال اعتبارسنجی..." : "ذخیره و اعتبارسنجی"}</span>
            <ArrowLeft className="h-3 w-3" />
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
