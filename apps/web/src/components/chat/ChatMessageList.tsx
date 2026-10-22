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

function renderFormattedContent(text: string) {
  if (!text) return null;

  // Split content by code blocks ```...```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstLineEnd = part.indexOf("\n");
      const lang = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : "";
      const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

      return (
        <pre
          key={index}
          dir="ltr"
          className="my-2 rounded-xl bg-neutral-950 p-3 font-mono text-xs text-emerald-300 border border-neutral-800 overflow-x-auto whitespace-pre leading-relaxed shadow-inner"
        >
          {lang && <div className="text-[10px] text-zinc-500 mb-1 select-none font-sans uppercase">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    // Process line-by-line formatting (bold, inline code, links)
    const lines = part.split("\n");
    return (
      <div key={index} className="space-y-1">
        {lines.map((line, lineIdx) => {
          const inlineElements: React.ReactNode[] = [];
          let remaining = line;
          let inlineKey = 0;

          while (remaining.length > 0) {
            const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);
            const codeMatch = remaining.match(/`([^`]+)`/);
            const boldMatch = remaining.match(/\*\*(.*?)\*\*/);

            const matches = [
              linkMatch ? { type: "link", match: linkMatch, index: linkMatch.index! } : null,
              codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
              boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
            ].filter((m): m is NonNullable<typeof m> => m !== null).sort((a, b) => a.index - b.index);

            if (matches.length === 0) {
              inlineElements.push(remaining);
              break;
            }

            const first = matches[0];
            if (first.index > 0) {
              inlineElements.push(remaining.substring(0, first.index));
            }

            if (first.type === "link") {
              const [full, title, url] = first.match;
              inlineElements.push(
                <a
                  key={inlineKey++}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors mx-0.5"
                  dir="ltr"
                >
                  {title}
                </a>
              );
              remaining = remaining.substring(first.index + full.length);
            } else if (first.type === "code") {
              const [full, codeText] = first.match;
              inlineElements.push(
                <code
                  key={inlineKey++}
                  dir="ltr"
                  className="rounded-md bg-zinc-800/90 px-1.5 py-0.5 font-mono text-xs text-sky-300 border border-zinc-700/60 mx-0.5 select-all"
                >
                  {codeText}
                </code>
              );
              remaining = remaining.substring(first.index + full.length);
            } else if (first.type === "bold") {
              const [full, boldText] = first.match;
              inlineElements.push(
                <strong key={inlineKey++} className="font-bold text-zinc-100">
                  {boldText}
                </strong>
              );
              remaining = remaining.substring(first.index + full.length);
            }
          }

          return (
            <div key={lineIdx} className={line.startsWith("•") || line.startsWith("- ") ? "pr-2" : ""}>
              {inlineElements}
            </div>
          );
        })}
      </div>
    );
  });
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
                  <div className="leading-relaxed break-words">
                    {renderFormattedContent(msg.content)}
                  </div>

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

