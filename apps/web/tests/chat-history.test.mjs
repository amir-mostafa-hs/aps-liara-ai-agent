import test from "node:test";
import assert from "node:assert/strict";
import { redactChatValue } from "../src/lib/chat-history.ts";

test("conversation persistence redacts credentials from text and nested tool results", () => {
  const safe = redactChatValue({
    text: "Authorization: Bearer abc.def.123 SERVICE_SECRET=do-not-store",
    result: { api_token: "private-token", app: "simple-app" },
  });

  assert.equal(JSON.stringify(safe).includes("abc.def.123"), false);
  assert.equal(JSON.stringify(safe).includes("do-not-store"), false);
  assert.equal(JSON.stringify(safe).includes("private-token"), false);
  assert.equal(safe.result.app, "simple-app");
});
