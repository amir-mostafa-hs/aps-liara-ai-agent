"use client";

import React, { useState, KeyboardEvent } from "react";
import { Send, Sparkles, FolderCode } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onQuickPreset?: (presetText: string) => void;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  onQuickPreset,
}: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const presets = [
    { label: "دپلوی پروژه نمونه Node.js", text: "می‌خواهم پروژه sample-apps/nodejs-demo را روی لیارا دیپلوی کنم." },
    { label: "بررسی نیازمندی‌های پروژه", text: "سورس‌کد پروژه من در sample-apps/nodejs-demo را بررسی کن و سرویس‌های لازم را مشخص کن." },
    { label: "تنظیم توکن اکانت لیارا", text: "چگونه می‌توانم توکن API لیارا را تنظیم کنم؟" },
  ];

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur p-4 shrink-0 flex flex-col gap-2.5">
      {/* Quick Prompt Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-zinc-500 shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-blue-400" />
          پیشنهادها:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (onQuickPreset) {
                onQuickPreset(p.text);
              } else {
                onSendMessage(p.text);
              }
            }}
            className="rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 px-3 py-1 text-zinc-300 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Field Form */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 focus-within:border-blue-500/80 transition-colors shadow-inner">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="پیام یا درخواست خود را بنویسید (مثلاً: پروژه sample-apps/nodejs-demo را دپلوی کن)..."
          disabled={isLoading}
          rows={1}
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none px-3 py-2 max-h-32 min-h-[40px] leading-relaxed"
        />

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 disabled:opacity-30 disabled:hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
          title="ارسال پیام"
        >
          <Send className="h-4 w-4 rotate-180" />
        </button>
      </form>
    </div>
  );
}

