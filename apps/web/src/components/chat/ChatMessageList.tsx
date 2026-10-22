"use client";

import React, { useEffect, useRef } from "react";
import { Bot, User, Sparkles } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  widget?: {
    type: string;
    data?: any;
  } | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  renderWidget?: (widget: { type: string; data?: any }) => React.ReactNode;
}

export function ChatMessageList({
  messages = [],
  isStreaming = false,
  renderWidget,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-zinc-200 mb-2">سلام! چطور می‌تونم در دپلوی به شما کمک کنم؟</h2>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            کافیه مسیر پروژه محلی‌تون رو بنویسید یا نیازمندی‌هاتون رو مطرح کنید. ایجنت هوشمند سورس‌کد شما رو بررسی کرده،
            دیتابیس‌ها و سرویس‌های لازم در لیارا رو آماده می‌کنه و دپلوی امن رو انجام میده.
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble & Content */}
              <div
                className={`flex flex-col max-w-[85%] ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-bl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {/* Optional Interactive Widget Slot */}
                  {msg.widget && renderWidget && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 w-full">
                      {renderWidget(msg.widget)}
                    </div>
                  )}
                </div>

                {msg.timestamp && (
                  <span className="text-[10px] text-zinc-500 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      {isStreaming && (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
            <Bot className="h-4 w-4" />
          </div>
          <div className="rounded-2xl rounded-bl-none bg-zinc-900 border border-zinc-800/80 px-4 py-3 text-xs text-zinc-400 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <span>ایجنت در حال تحلیل و پردازش است...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
