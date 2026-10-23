import { redactChatValue } from "./chat-history.ts";

type PrismaLike = {
  conversation: any;
  conversationMessage: any;
};

export async function listUserConversations(prisma: PrismaLike, userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
}

export async function loadUserConversation(prisma: PrismaLike, userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
}

export async function saveConversationMessage(
  prisma: PrismaLike,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: unknown,
) {
  return prisma.conversationMessage.create({
    data: {
      conversationId,
      role,
      content: redactChatValue(content),
      metadata: metadata === undefined ? undefined : redactChatValue(metadata),
    },
  });
}
