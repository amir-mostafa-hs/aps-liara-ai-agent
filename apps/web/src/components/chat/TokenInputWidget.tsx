"use client";

import React, { useState } from "react";
import { Eye, EyeOff, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

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
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    initialTokenMasked ? `توکن فعال: ${initialTokenMasked}` : null
  );

  const handleTestConnection = async () => {
    if (!token.trim()) return;
    setTesting(true);
    setError(null);
    setTestStatus(null);
    try {
      const res = await fetch("/api/liara/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_token: token.trim(), team_id: teamId.trim() || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus("اتصال برقرار است. توکن معتبر می‌باشد.");
      } else {
        setError(data.error || "اتصال با خطا مواجه شد.");
      }
    } catch {
      setError("خطا در برقراری ارتباط با سرویس تست.");
    } finally {
      setTesting(false);
    }
  };

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

      setSuccess(`توکن با موفقیت در نشست شما ذخیره شد: ${data.maskedToken}`);
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
    <article className="card w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/icon-key.webp"
        alt=""
        className="ico fl"
      />
      <div className="body">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-100 text-base">ثبت کلید دسترسی لیارا</h3>
          <span className="pill border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            ذخیره محلی امن
          </span>
        </div>

        <p className="t">
          برای صدور دستورات خودکار، کلید دسترسی خود را از{" "}
          <a
            href="https://console.liara.ir"
            target="_blank"
            rel="noreferrer"
            className="text-liara hover:underline inline-flex items-center gap-1 font-medium"
          >
            کنسول لیارا
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          دریافت کرده و در این کادر وارد نمایید.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                dir="ltr"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                disabled={loading}
                className="inp pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !token.trim()}
              className="b0 shrink-0 flex items-center gap-1.5"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>تست اتصال</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 whitespace-nowrap">شناسه تیم (اختیاری):</span>
            <input
              type="text"
              dir="ltr"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="team-..."
              disabled={loading}
              className="inp !py-1 text-xs"
            />
          </div>

          {testStatus && (
            <p className="flex items-center gap-2 text-xs text-emerald-300">
              <i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {testStatus}
            </p>
          )}

          {success && (
            <p className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {success}
            </p>
          )}

          {error && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="b2 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
            <span>ذخیره کلید</span>
          </button>
        </form>
      </div>
    </article>
  );
}
