import test from "node:test";
import assert from "node:assert/strict";
import { loadUserConversation, saveConversationMessage } from "../src/lib/chat-conversations.ts";

test("conversation reads are scoped to the owning user", async () => {
  const store = {
    conversation: {
      findFirst: async ({ where }) => where.id === "conversation-1" && where.userId === "user-1"
        ? { id: "conversation-1", userId: "user-1", messages: [] }
        : null,
    },
    conversationMessage: {},
  };

  assert.equal((await loadUserConversation(store, "user-1", "conversation-1")).id, "conversation-1");
  assert.equal(await loadUserConversation(store, "user-2", "conversation-1"), null);
});

test("saved messages redact secrets from content and tool metadata", async () => {
  let saved;
  const store = {
    conversation: {},
    conversationMessage: { create: async ({ data }) => { saved = data; return data; } },
  };
  await saveConversationMessage(store, "conversation-1", "assistant", "توکن Bearer abc.def را دریافت کردم", { api_token: "abc.def", safe: true });

  assert.equal(saved.content.includes("abc.def"), false);
  assert.equal(saved.metadata.api_token, "[REDACTED]");
  assert.equal(saved.metadata.safe, true);
});
