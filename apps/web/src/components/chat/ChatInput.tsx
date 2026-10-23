"use client";

import React, { useState, KeyboardEvent } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
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

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur-md lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          aria-label="ارسال پیام به ایجنت"
          className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 p-2 focus-within:border-liara focus-within:ring-2 focus-within:ring-liara/40 transition-all"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="دستور خود را بنویسید…"
            disabled={isLoading}
            aria-label="پیام خود را بنویسید"
            aria-describedby="chat-input-hint"
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-base leading-7 placeholder:text-zinc-400 text-zinc-100 focus:outline-none min-h-[44px] max-h-36"
          />

          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            aria-label="ارسال پیام"
            className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-liara to-mint text-zinc-950 hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100 transition-all cursor-pointer shrink-0"
          >
            <svg className="h-4 w-4 -scale-x-100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-6.8l9-1.7-9-1.7V3.5L22 12 3 20.5Z" />
            </svg>
          </button>
        </form>
        <p id="chat-input-hint" className="mt-1.5 px-1 text-xs text-zinc-400">
          برای ارسال Enter و برای رفتن به خط بعدی Shift+Enter را بزنید.
        </p>
      </div>
    </div>
  );
}
