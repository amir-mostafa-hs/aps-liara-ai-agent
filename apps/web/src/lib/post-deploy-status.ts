import type { ChatMessage } from "@/components/chat/ChatMessageList";

export const POST_DEPLOY_PROGRESS_CONTENT =
  "دپلوی انجام شد؛ در حال بررسی سلامت سایت و لاگ‌های اجرای برنامه هستم. ممکن است این بررسی چند لحظه طول بکشد.";

export function createPostDeployProgressMessage(
  id: string,
  timestamp = new Date().toISOString(),
): ChatMessage {
  return {
    id,
    role: "assistant",
    content: POST_DEPLOY_PROGRESS_CONTENT,
    timestamp,
  };
}

export function updateChatMessage(
  messages: ChatMessage[],
  messageId: string,
  update: Partial<ChatMessage>,
): ChatMessage[] {
  return messages.map((message) =>
    message.id === messageId ? { ...message, ...update } : message,
  );
}

export async function runPostDeployCheck(
  runId: string,
  onProgress: (message: ChatMessage) => void,
  fetcher: typeof fetch = fetch,
): Promise<{ progressMessage: ChatMessage; result: Record<string, any> }> {
  const progressMessage = createPostDeployProgressMessage("post-deploy-" + runId);
  onProgress(progressMessage);

  const response = await fetcher("/api/runs/" + runId + "/post-deploy-check", {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.result) {
    throw new Error(data.error || "نتیجهٔ بررسی پس از دپلوی دریافت نشد.");
  }

  return { progressMessage, result: data.result };
}
