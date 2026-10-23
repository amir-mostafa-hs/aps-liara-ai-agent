"use client";

import React, { useState, KeyboardEvent } from "react";

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
    <div className="shrink-0 border-t border-white/10 bg-white/[.03] px-4 py-3 backdrop-blur-xl lg:px-8">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* Preset action chips */}
        <div className="flex flex-wrap gap-2 text-xs">
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
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300 hover:border-liara/50 hover:text-liara disabled:opacity-40 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 focus-within:border-liara/60 focus-within:shadow-[0_0_30px_-10px_#2cc4f4] transition-all"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="دستور خود را بنویسید…"
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-7 placeholder:text-zinc-500 text-zinc-100 focus:outline-none min-h-[40px] max-h-36"
          />

          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            aria-label="ارسال"
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-liara to-mint text-zinc-950 hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 transition-all cursor-pointer shadow-md shadow-liara/20 shrink-0"
          >
            <svg className="h-5 w-5 -scale-x-100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-6.8l9-1.7-9-1.7V3.5L22 12 3 20.5Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
