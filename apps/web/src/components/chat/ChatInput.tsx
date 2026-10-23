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
          className="flex items-end gap-2 rounded-none border border-zinc-800 bg-zinc-900/70 p-2 focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 transition-all"
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
            className="grid h-9 w-9 place-items-center rounded-none bg-gradient-to-br from-liara to-mint text-zinc-950 hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 transition-all cursor-pointer shrink-0"
          >
            <svg className="h-4 w-4 -scale-x-100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-6.8l9-1.7-9-1.7V3.5L22 12 3 20.5Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
