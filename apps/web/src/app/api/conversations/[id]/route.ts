import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadUserConversation } from "@/lib/chat-conversations";
import { redactChatValue } from "@/lib/chat-history";

async function ownedConversation(id: string) {
  const session = await getCurrentUser();
  if (!session.authenticated || !session.username) return { status: 401 as const, conversation: null };
  const user = await prisma.user.findUnique({ where: { username: session.username } });
  if (!user) return { status: 401 as const, conversation: null };
  const conversation = await loadUserConversation(prisma, user.id, id);
  return { status: conversation ? 200 as const : 404 as const, conversation };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownedConversation(id);
  if (!result.conversation) {
    return NextResponse.json({ ok: false, error: result.status === 401 ? "وارد حساب شوید." : "گفت‌وگو پیدا نشد." }, { status: result.status });
  }
  return NextResponse.json({ ok: true, conversation: redactChatValue(result.conversation) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownedConversation(id);
  if (!result.conversation) {
    return NextResponse.json({ ok: false, error: result.status === 401 ? "وارد حساب شوید." : "گفت‌وگو پیدا نشد." }, { status: result.status });
  }
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
