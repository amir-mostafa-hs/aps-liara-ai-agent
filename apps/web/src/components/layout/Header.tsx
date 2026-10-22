"use client";

import React from "react";
import { LogOut, Users, Sparkles } from "lucide-react";

interface HeaderProps {
  username?: string;
  activeTeam?: { id: string; name: string } | null;
  onLogout?: () => void;
  systemConnected?: boolean;
}

export function Header({
  username = "admin",
  activeTeam,
  onLogout,
  systemConnected = true,
}: HeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 py-3 shrink-0 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100">ایجنت هوشمند لیارا</h1>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20">
              دستیار مکالمه‌ای
            </span>
          </div>
          <p className="text-xs text-zinc-400">دپلوی خودکار، ساخت پایگاه داده و عیب‌یابی هوشمند SRE</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {activeTeam && (
          <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-1.5 border border-zinc-700/60 text-zinc-300">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-zinc-400">تیم:</span>
            <span className="font-semibold text-zinc-200">{activeTeam.name || activeTeam.id}</span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 px-3 py-1.5 border border-zinc-800 text-zinc-300">
          <span
            className={`h-2 w-2 rounded-full ${
              systemConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-zinc-400">اپراتور:</span>
          <span className="font-medium text-zinc-200">{username}</span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mr-2 text-zinc-500 hover:text-rose-400 transition-colors"
              title="خروج"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
