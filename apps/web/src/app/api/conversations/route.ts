import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listUserConversations, loadUserConversation } from "@/lib/chat-conversations";
import { redactChatValue } from "@/lib/chat-history";

async function currentDatabaseUser() {
  const session = await getCurrentUser();
  if (!session.authenticated || !session.username) return null;
  return prisma.user.findUnique({ where: { username: session.username } });
}

export async function GET() {
  const user = await currentDatabaseUser();
  if (!user) return NextResponse.json({ ok: false, error: "برای مشاهدهٔ گفتگوها وارد حساب شوید." }, { status: 401 });
  const conversations = await listUserConversations(prisma, user.id);
  const active = conversations[0]
    ? await loadUserConversation(prisma, user.id, conversations[0].id)
    : null;
  return NextResponse.json({ ok: true, conversations: redactChatValue(conversations), activeConversation: redactChatValue(active) });
}

export async function POST() {
  const user = await currentDatabaseUser();
  if (!user) return NextResponse.json({ ok: false, error: "برای ساخت گفت‌وگو وارد حساب شوید." }, { status: 401 });
  const conversation = await prisma.conversation.create({ data: { userId: user.id } });
  return NextResponse.json({ ok: true, conversation }, { status: 201 });
}
