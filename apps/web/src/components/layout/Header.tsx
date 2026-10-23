"use client";

import React from "react";

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
    <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md z-20">
      <div className="h-14 flex items-center justify-between gap-3 px-4 lg:px-6">
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
            <span className="hidden md:flex items-center gap-1.5 rounded-none border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-zinc-300 font-mono">
              <span className="text-zinc-500">TEAM:</span>
              <span dir="ltr" className="text-zinc-200">
                {activeTeam.name || activeTeam.id}
              </span>
            </span>
          )}

          <span
            className={`pill flex items-center gap-2 border py-1 text-xs font-mono ${
              systemConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <i
              className={`h-1.5 w-1.5 rounded-none ${
                systemConnected ? "bg-emerald-400 pulse" : "bg-rose-400"
              }`}
            />
            {systemConnected ? "ONLINE" : "OFFLINE"}
          </span>

          <span className="hidden sm:flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-zinc-300 font-mono">
            <span className="h-3.5 w-3.5 rounded-none bg-gradient-to-br from-liara to-mint shrink-0" />
            <span dir="ltr" className="text-zinc-200">
              {username}
            </span>
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-none border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5 focus:outline-none transition-colors cursor-pointer"
            >
              خروج
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
