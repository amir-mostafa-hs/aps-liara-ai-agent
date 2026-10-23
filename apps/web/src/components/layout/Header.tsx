"use client";

import React from "react";

export type PipelineStage = "source" | "credentials" | "database" | "diff" | "deploy" | "heal";

interface HeaderProps {
  username?: string;
  activeTeam?: { id: string; name: string } | null;
  onLogout?: () => void;
  systemConnected?: boolean;
  currentStage?: PipelineStage;
  onSelectStage?: (stage: PipelineStage) => void;
}

const STAGES: Array<{ id: PipelineStage; label: string; icon: string }> = [
  { id: "source", label: "سورس", icon: "/assets/icon-source.webp" },
  { id: "credentials", label: "دسترسی", icon: "/assets/icon-key.webp" },
  { id: "database", label: "دیتابیس", icon: "/assets/icon-db.webp" },
  { id: "diff", label: "تغییرات", icon: "/assets/icon-diff.webp" },
  { id: "deploy", label: "دپلوی", icon: "/assets/icon-deploy.webp" },
  { id: "heal", label: "خودترمیمی", icon: "/assets/icon-heal.webp" },
];

export function Header({
  username = "admin",
  activeTeam,
  onLogout,
  systemConnected = true,
  currentStage = "source",
  onSelectStage,
}: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-white/[.03] backdrop-blur-xl z-20">
      {/* Row 1: Brand & User bar */}
      <div className="h-16 flex items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt="لوگوی ایجنت هوشمند لیارا"
            className="ico !w-12 !h-12 sm:!w-14 sm:!h-14"
          />
          <h1 className="font-bold text-zinc-100 text-base sm:text-lg">ایجنت هوشمند لیارا</h1>
          <span className="pill hidden sm:inline border border-liara/30 bg-liara/10 text-liara font-medium">
            دستیار مکالمه‌ای SRE
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {activeTeam && (
            <span className="hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300">
              <span className="text-zinc-400">تیم:</span>
              <span dir="ltr" className="font-mono text-xs text-zinc-200">
                {activeTeam.name || activeTeam.id}
              </span>
            </span>
          )}

          <span
            className={`pill flex items-center gap-2 border py-1 text-xs font-medium ${
              systemConnected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/30 bg-rose-400/10 text-rose-300"
            }`}
          >
            <i
              className={`h-2 w-2 rounded-full ${
                systemConnected ? "bg-emerald-400 pulse" : "bg-rose-400"
              }`}
            />
            {systemConnected ? "عملیاتی" : "قطع ارتباط"}
          </span>

          <span className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-zinc-300">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-liara to-mint shrink-0 shadow-sm shadow-liara/20" />
            <span dir="ltr" className="font-mono text-xs text-zinc-200">
              {username}
            </span>
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:border-rose-400/50 hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/40 transition-colors cursor-pointer"
            >
              خروج
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Stage navigation bar */}
      <nav className="flex gap-2 overflow-x-auto border-t border-white/10 bg-white/[.02] px-4 lg:px-6 py-1.5 text-sm no-scrollbar">
        {STAGES.map((stage) => {
          const isActive = currentStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage?.(stage.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1 transition-all cursor-pointer ${
                isActive
                  ? "bg-liara/10 text-liara border border-liara/30 font-medium shadow-sm shadow-liara/10"
                  : "text-zinc-300 hover:bg-white/5 border border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stage.icon}
                alt=""
                className="ico !w-8 !h-8 sm:!w-9 sm:!h-9"
              />
              <span>{stage.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
