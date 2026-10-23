"use client";

import React from "react";
import { Trash2 } from "lucide-react";

interface HeaderProps {
  username?: string;
  activeTeam?: { id: string; name: string } | null;
  onLogout?: () => void;
  onClearConversation?: () => void;
  isClearingConversation?: boolean;
  isStreaming?: boolean;
  systemConnected?: boolean;
}

export function Header({
  username = "admin",
  activeTeam,
  onLogout,
  onClearConversation,
  isClearingConversation = false,
  isStreaming = false,
  systemConnected = true,
}: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md z-20">
      <div className="min-h-14 flex items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt="لوگوی ایجنت هوشمند لیارا"
            className="ico !w-10 !h-10 sm:!w-12 sm:!h-12"
          />
          <h1 className="font-bold text-zinc-100 text-sm sm:text-base tracking-tight">
            ایجنت هوشمند لیارا
          </h1>
          <span className="pill hidden sm:inline border border-zinc-800 bg-zinc-900/70 text-zinc-300 font-mono text-[11px]">
            SRE ASSISTANT
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
          {activeTeam && (
            <span className="hidden md:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-zinc-300 font-mono">
              <span className="text-zinc-400">تیم:</span>
              <span dir="ltr" className="text-zinc-200">
                {activeTeam.name || activeTeam.id}
              </span>
            </span>
          )}

          <span
            role="status"
            aria-live="polite"
            aria-label={systemConnected ? "وضعیت اتصال: متصل" : "وضعیت اتصال: قطع"}
            className={`pill flex items-center gap-2 border py-1 text-xs font-mono ${
              systemConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <i
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                systemConnected ? "bg-emerald-400 pulse" : "bg-rose-400"
              }`}
            />
            {systemConnected ? "متصل" : "قطع"}
          </span>

          <span className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-zinc-300 font-mono">
            <span className="h-3.5 w-3.5 rounded-lg bg-gradient-to-br from-liara to-mint shrink-0" />
            <span dir="ltr" className="text-zinc-200">
              {username}
            </span>
          </span>

          {onClearConversation && (
            <button
              type="button"
              onClick={onClearConversation}
              disabled={isClearingConversation || isStreaming}
              aria-label="حذف تاریخچهٔ گفت‌وگوی فعلی"
              title="حذف تاریخچهٔ گفت‌وگوی فعلی"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">پاک‌کردن گفتگو</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5 focus:outline-none transition-colors cursor-pointer"
            >
              خروج
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
