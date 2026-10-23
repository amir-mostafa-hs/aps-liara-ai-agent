import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadUserConversation, saveConversationMessage } from "@/lib/chat-conversations";
import { redactChatValue, redactChatText } from "@/lib/chat-history";

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session.authenticated || !session.username) {
    return NextResponse.json({ ok: false, error: "برای گفت‌وگو وارد حساب شوید." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!conversationId || !message || message.length > 8000) {
    return NextResponse.json({ ok: false, error: "شناسهٔ گفتگو و پیام معتبر لازم است." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username: session.username } });
  if (!user) return NextResponse.json({ ok: false, error: "حساب کاربری پیدا نشد." }, { status: 401 });
  const conversation = await loadUserConversation(prisma, user.id, conversationId);
  if (!conversation) return NextResponse.json({ ok: false, error: "گفت‌وگو پیدا نشد." }, { status: 404 });

  const apiToken = user.liaraToken || process.env.LIARA_API_TOKEN || "";
  const safeMessage = redactChatText(message);
  const history = conversation.messages.slice(-20).map((item: { role: string; content: string }) => ({ role: item.role, content: item.content }));
  await saveConversationMessage(prisma, conversation.id, "user", safeMessage);

  let result: { message: string; tool_results?: unknown[]; catalog_version?: number };
  try {
      const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
      const internalSecret = process.env.INTERNAL_AGENT_SECRET;
      if (!internalSecret) {
        return NextResponse.json({ ok: false, error: "اتصال امن موتور Agent پیکربندی نشده است." }, { status: 503 });
      }
      const engineResponse = await fetch(`${engineUrl}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
        body: JSON.stringify({
          conversation_id: conversation.id,
          message: safeMessage,
          history,
          api_token: apiToken,
          team_id: user.liaraTeamId || process.env.LIARA_TEAM_ID || undefined,
        }),
        cache: "no-store",
      });
      const data = await engineResponse.json();
      if (!engineResponse.ok || !data.ok || typeof data.message !== "string") {
        result = { message: "پردازش پیام با خطا روبه‌رو شد. اتصال موتور Agent را بررسی و دوباره تلاش کنید." };
      } else {
        result = { message: data.message, tool_results: data.tool_results || [], catalog_version: data.catalog_version };
      }
  } catch {
    result = { message: "ارتباط با موتور Agent برقرار نشد. چند لحظهٔ دیگر دوباره تلاش کنید." };
  }

  const safeResult = redactChatValue(result);
  const assistantMessage = await saveConversationMessage(
    prisma,
    conversation.id,
    "assistant",
    safeResult.message,
    { tool_results: safeResult.tool_results || [], catalog_version: safeResult.catalog_version || 1 },
  );
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: conversation.messages.length === 0
      ? { title: safeMessage.slice(0, 72) || "گفت‌وگوی جدید" }
      : { updatedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    conversationId: conversation.id,
    message: { id: assistantMessage.id, role: "assistant", content: assistantMessage.content, createdAt: assistantMessage.createdAt },
    toolResults: safeResult.tool_results || [],
  });
}
