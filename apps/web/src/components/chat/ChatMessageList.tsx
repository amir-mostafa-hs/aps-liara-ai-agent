"use client";

import React, { useEffect, useRef } from "react";

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
  onStartDeploy?: () => void;
  onShowGuide?: () => void;
  onSelectPrompt?: (promptText: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: "🚀",
    title: "دپلوی پروژه نمونه Node.js",
    desc: "پروژه sample-apps/nodejs-demo را روی لیارا دیپلوی کن.",
    text: "می‌خواهم پروژه sample-apps/nodejs-demo را روی لیارا دیپلوی کنم.",
  },
  {
    icon: "🔍",
    title: "بررسی نیازمندی‌های پروژه",
    desc: "سورس‌کد را بررسی کن و سرویس‌های لازم را مشخص کن.",
    text: "سورس‌کد پروژه من در sample-apps/nodejs-demo را بررسی کن و سرویس‌های لازم را مشخص کن.",
  },
  {
    icon: "🔑",
    title: "تنظیم توکن اکانت لیارا",
    desc: "بررسی وضعیت احراز هویت و توکن API لیارا.",
    text: "چگونه می‌توانم توکن API لیارا را تنظیم کنم؟",
  },
];

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
          className="my-2 rounded-none bg-zinc-950/90 p-3.5 font-mono text-xs text-emerald-300 border border-zinc-800 overflow-x-auto whitespace-pre leading-relaxed shadow-none"
        >
          {lang && <div className="text-[10px] text-zinc-500 mb-1 select-none font-mono uppercase">{lang}</div>}
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
                  className="text-liara underline underline-offset-2 hover:brightness-125 transition-colors mx-0.5"
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
                  className="rounded-none bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-liara border border-zinc-800 mx-0.5 select-all"
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
  onStartDeploy,
  onShowGuide,
  onSelectPrompt,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasUserStartedChat = messages.some((m) => m.role === "user");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="scroll flex-1 overflow-y-auto px-4 lg:px-8 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Welcome hero banner */}
        <div className="relative overflow-hidden rounded-none border border-zinc-800 bg-zinc-950/80 bg-grid shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero-agent.webp"
            alt=""
            className="absolute inset-y-0 left-0 h-full w-3/5 object-cover [mask-image:linear-gradient(to_right,#000_35%,transparent)] opacity-80 pointer-events-none"
          />
          <div className="relative p-6 sm:p-7 sm:w-3/5 mr-auto">
            <div className="inline-block px-2 py-0.5 mb-2 rounded-none border border-zinc-800 bg-zinc-900/80 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              SRE PLATFORM AUTOMATION
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-9 text-zinc-100">
              سلام! من ایجنت SRE لیارا هستم
            </h2>
            <p className="t mt-1 text-zinc-400 text-xs sm:text-sm">
              پروژه را دپلوی می‌کنم، خطاها را ریشه‌یابی می‌کنم و هیچ عملیاتی بدون تأیید شما انجام نمی‌دهم.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onStartDeploy}
                className="b3 cursor-pointer"
              >
                شروع دپلوی
              </button>
              <button
                type="button"
                onClick={onShowGuide}
                className="b0 cursor-pointer"
              >
                راهنما
              </button>
            </div>
          </div>
        </div>

        {/* Transparent floating suggested prompt popups (hidden once chat starts) */}
        {!hasUserStartedChat && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono uppercase px-1 tracking-wider">
              <span className="flex h-1.5 w-1.5 rounded-none bg-liara" />
              <span>پیشنهادهای گفتگو:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt?.(prompt.text)}
                  className="group relative text-right rounded-none border border-zinc-800 bg-zinc-950/70 p-3.5 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0 p-1 rounded-none bg-zinc-900 border border-zinc-800">
                      {prompt.icon}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-zinc-200 group-hover:text-liara transition-colors">
                      {prompt.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {prompt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[80%] rounded-none bg-zinc-900/90 border border-zinc-700/80 px-4 py-3 text-sm leading-7 text-zinc-100 shadow-none">
                  <div className="leading-relaxed break-words">{renderFormattedContent(msg.content)}</div>
                  {msg.timestamp && (
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 block text-left">
                      {new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Assistant Message
          return (
            <div key={msg.id} className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logo.webp"
                alt=""
                className="ico !w-9 !h-9 sm:!w-10 sm:!h-10 shrink-0 mt-1"
              />
              <div className="flex-1 min-w-0 space-y-3">
                {msg.content && (
                  <div className="rounded-none bg-zinc-950/70 border border-zinc-800 px-4 sm:px-5 py-4 text-sm leading-7 text-zinc-200 shadow-none">
                    <div className="leading-relaxed break-words space-y-2">
                      {renderFormattedContent(msg.content)}
                    </div>
                    {msg.timestamp && (
                      <span className="text-[10px] text-zinc-500 font-mono mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                )}

                {msg.widget && renderWidget && (
                  <div className="w-full">{renderWidget(msg.widget)}</div>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.webp"
              alt=""
              className="ico !w-8 !h-8 animate-pulse shrink-0"
            />
            <div className="rounded-none bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 text-xs font-mono text-liara flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-none bg-liara animate-ping" />
              <span>ایجنت در حال تحلیل و پردازش است...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
